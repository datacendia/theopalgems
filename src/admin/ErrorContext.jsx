import React, { createContext, useContext, useState } from 'react';

// Error context for global error handling
const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [errors, setErrors] = useState([]);

  const addError = (error) => {
    const id = Date.now();
    const errorObj = {
      id,
      message: typeof error === 'string' ? error : error.message || 'An error occurred',
      type: 'error',
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, errorObj]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeError(id);
    }, 5000);
  };

  const removeError = (id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const addSuccess = (message) => {
    const id = Date.now();
    const successObj = {
      id,
      message,
      type: 'success',
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, successObj]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeError(id);
    }, 3000);
  };

  return (
    <ErrorContext.Provider value={{ addError, addSuccess, removeError, errors }}>
      {children}
      <ErrorNotifications />
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}

function ErrorNotifications() {
  const { errors, removeError } = useError();

  return (
    <div className="error-notifications">
      {errors.map(error => (
        <div 
          key={error.id} 
          className={`error-notification ${error.type}`}
          onClick={() => removeError(error.id)}
        >
          <span className="error-message">{error.message}</span>
          <button className="error-close">×</button>
        </div>
      ))}
    </div>
  );
}

// Loading hook for consistent loading states
export function useLoading(initialState = false) {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const execute = async (operation) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, execute, setLoading, setError };
}

// Form validation helper
export function validateForm(data, rules) {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    if (fieldRules.required && (!value || value.toString().trim() === '')) {
      errors[field] = `${field} is required`;
    }
    
    if (fieldRules.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      errors[field] = 'Please enter a valid email address';
    }
    
    if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
      errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
    }
    
    if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
      errors[field] = `${field} must be no more than ${fieldRules.maxLength} characters`;
    }
    
    if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.message || `${field} format is invalid`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
