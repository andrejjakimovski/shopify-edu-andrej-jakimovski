import { Component } from '@theme/component';

/**
 * GraphQL Newsletter Component
 * Demonstrates Shopify Storefront API usage with GraphQL
 * 
 * This component handles newsletter signup using the Storefront API's
 * customerCreate mutation to demonstrate GraphQL integration.
 */
class GraphQLNewsletterComponent extends Component {
  requiredRefs = ['form', 'emailInput', 'passwordInput', 'submitButton', 'messageContainer'];

  connectedCallback() {
    super.connectedCallback();
    this.storefrontAccessToken = this.dataset.storefrontToken;
    this.shopDomain = this.dataset.shopDomain;
  }

  /**
   * Handles form submission
   * @param {Event} event - The form submit event
   */
  handleSubmit = async (event) => {
    event.preventDefault();

    const emailInput = /** @type {HTMLInputElement} */ (this.refs.emailInput);
    const passwordInput = /** @type {HTMLInputElement} */ (this.refs.passwordInput);
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email) {
      this.showMessage('Please enter a valid email address.', 'error');
      return;
    }

    if (!password || password.length < 8) {
      this.showMessage('Password must be at least 8 characters.', 'error');
      return;
    }

    // Lock the form during submission
    this.setLoadingState(true);

    try {
      const result = await this.submitToStorefront(email, password);
      
      if (result.success) {
        this.showMessage(result.message || 'Successfully subscribed to our newsletter!', 'success');
        const form = /** @type {HTMLFormElement} */ (this.refs.form);
        form.reset();
      } else {
        this.showMessage(result.message || 'Subscription failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('GraphQL Error:', error);
      this.showMessage('An error occurred. Please try again later.', 'error');
    } finally {
      // Unlock the form after submission
      this.setLoadingState(false);
    }
  };

  /**
   * Submits email and password to Shopify Storefront API using GraphQL
   * @param {string} email - The customer's email
   * @param {string} password - The customer's password
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async submitToStorefront(email, password) {
    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        email: email,
        password: password,
        acceptsMarketing: true
      }
    };

    const endpoint = `https://${this.shopDomain}/api/2024-01/graphql.json`;

    console.log('📤 Sending GraphQL request to Storefront API...');
    console.log('Endpoint:', endpoint);
    console.log('Mutation:', mutation);
    console.log('Variables:', variables);

    if (!this.storefrontAccessToken) {
      throw new Error('Storefront API token is not configured');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables,
      }),
    });

    const data = await response.json();
    
    console.log('📥 GraphQL Response:', data);

    // Check for GraphQL errors
    if (data.errors) {
      return {
        success: false,
        message: data.errors[0]?.message || 'GraphQL error occurred',
      };
    }

    // Check for customer user errors
    const customerUserErrors = data.data?.customerCreate?.customerUserErrors || [];
    
    if (customerUserErrors.length > 0) {
      const errorMessage = customerUserErrors[0].message;
      
      // Handle duplicate email (already subscribed)
      if (errorMessage.includes('taken') || errorMessage.includes('already')) {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter!',
        };
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }

    // Success
    if (data.data?.customerCreate?.customer) {
      return {
        success: true,
        message: 'Successfully subscribed! Check your email for confirmation.',
      };
    }

    return {
      success: false,
      message: 'Unexpected response from server.',
    };
  }

  /**
   * Sets the loading state of the form
   * @param {boolean} isLoading - Whether the form is loading
   */
  setLoadingState(isLoading) {
    const form = /** @type {HTMLFormElement} */ (this.refs.form);
    const submitButton = /** @type {HTMLButtonElement} */ (this.refs.submitButton);
    const emailInput = /** @type {HTMLInputElement} */ (this.refs.emailInput);
    const passwordInput = /** @type {HTMLInputElement} */ (this.refs.passwordInput);

    if (isLoading) {
      submitButton.disabled = true;
      emailInput.disabled = true;
      passwordInput.disabled = true;
      submitButton.classList.add('loading');
      submitButton.textContent = 'Submitting...';
      form.classList.add('is-loading');
    } else {
      submitButton.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      submitButton.classList.remove('loading');
      submitButton.textContent = submitButton.dataset.originalText || 'Subscribe';
      form.classList.remove('is-loading');
    }
  }

  /**
   * Displays a message to the user
   * @param {string} message - The message to display
   * @param {'success' | 'error'} type - The type of message
   */
  showMessage(message, type) {
    const messageContainer = /** @type {HTMLDivElement} */ (this.refs.messageContainer);
    
    messageContainer.textContent = message;
    messageContainer.className = `graphql-newsletter__message graphql-newsletter__message--${type}`;
    messageContainer.style.display = 'flex';
    messageContainer.setAttribute('role', 'alert');
    messageContainer.setAttribute('aria-live', 'polite');

    // Auto-hide after 10 seconds (increased for better visibility)
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 10000);
  }
}

if (!customElements.get('graphql-newsletter-component')) {
  customElements.define('graphql-newsletter-component', GraphQLNewsletterComponent);
}

