/**
 * Validation Utilities
 * Ghoncheye Lalehzar CMS
 */

/**
 * Validation rules
 */
const rules = {
    required: (value) => value !== undefined && value !== null && value !== '',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    minLength: (value, min) => value && value.length >= min,
    maxLength: (value, max) => !value || value.length <= max,
    numeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
    alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value),
    phone: (value) => /^[\d\s\-+()]+$/.test(value),
    url: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    slug: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
    password: (value) => value && value.length >= 6,
    strongPassword: (value) => {
        if (!value || value.length < 8) return false;
        const hasUpper = /[A-Z]/.test(value);
        const hasLower = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        return hasUpper && hasLower && hasNumber;
    }
};

/**
 * Validate object against schema
 * @param {object} data - Data to validate
 * @param {object} schema - Validation schema
 * @returns {object} - {valid: boolean, errors: object}
 */
function validate(data, schema) {
    const errors = {};
    
    for (const [field, fieldRules] of Object.entries(schema)) {
        const value = data[field];
        
        for (const rule of fieldRules) {
            let ruleName, ruleParam;
            
            if (typeof rule === 'string') {
                ruleName = rule;
            } else {
                ruleName = rule.rule;
                ruleParam = rule.param;
            }
            
            const validator = rules[ruleName];
            
            if (!validator) {
                console.warn(`Unknown validation rule: ${ruleName}`);
                continue;
            }
            
            const isValid = ruleParam !== undefined 
                ? validator(value, ruleParam) 
                : validator(value);
            
            if (!isValid) {
                if (!errors[field]) errors[field] = [];
                
                errors[field].push(getErrorMessage(ruleName, field, ruleParam));
                break; // Stop at first error for this field
            }
        }
    }
    
    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Get error message for rule
 * @param {string} rule - Rule name
 * @param {string} field - Field name
 * @param {any} param - Rule parameter
 * @returns {string}
 */
function getErrorMessage(rule, field, param) {
    const messages = {
        required: `${field} is required`,
        email: `${field} must be a valid email`,
        minLength: `${field} must be at least ${param} characters`,
        maxLength: `${field} must not exceed ${param} characters`,
        numeric: `${field} must be a number`,
        alphanumeric: `${field} must contain only letters and numbers`,
        phone: `${field} must be a valid phone number`,
        url: `${field} must be a valid URL`,
        slug: `${field} must be a valid slug (lowercase letters, numbers, and hyphens)`,
        password: `${field} must be at least 6 characters`,
        strongPassword: `${field} must be at least 8 characters with uppercase, lowercase, and number`
    };
    
    return messages[rule] || `${field} is invalid`;
}

/**
 * Validate contact form
 * @param {object} data - Form data
 * @returns {object}
 */
function validateContactForm(data) {
    return validate(data, {
        email: ['required', 'email']
    });
}

/**
 * Validate login form
 * @param {object} data - Form data
 * @returns {object}
 */
function validateLogin(data) {
    return validate(data, {
        username: ['required'],
        password: ['required']
    });
}

/**
 * Validate user registration
 * @param {object} data - User data
 * @returns {object}
 */
function validateUser(data) {
    return validate(data, {
        username: ['required', { rule: 'minLength', param: 3 }],
        email: ['required', 'email'],
        password: ['required', 'password']
    });
}

/**
 * Validate post
 * @param {object} data - Post data
 * @returns {object}
 */
function validatePost(data) {
    return validate(data, {
        title: ['required', { rule: 'maxLength', param: 255 }]
    });
}

/**
 * Validate product
 * @param {object} data - Product data
 * @returns {object}
 */
function validateProduct(data) {
    return validate(data, {
        name: ['required', { rule: 'maxLength', param: 255 }]
    });
}

module.exports = {
    rules,
    validate,
    validateContactForm,
    validateLogin,
    validateUser,
    validatePost,
    validateProduct
};
