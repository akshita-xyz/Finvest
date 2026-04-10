function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 8;
}

function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
}

function formatResponse(success, data = null, message = null) {
  return {
    success,
    ...(data && { data }),
    ...(message && { message }),
    timestamp: new Date().toISOString()
  };
}

function handleError(error) {
  console.error('Error:', error);
  
  if (error.code === '23505') {
    return {
      status: 409,
      message: 'Resource already exists'
    };
  }
  
  if (error.code === '23503') {
    return {
      status: 400,
      message: 'Invalid reference to related resource'
    };
  }
  
  if (error.status === 401) {
    return {
      status: 401,
      message: 'Authentication required'
    };
  }
  
  if (error.status === 403) {
    return {
      status: 403,
      message: 'Access denied'
    };
  }
  
  return {
    status: 500,
    message: 'Internal server error'
  };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function corsOptions() {
  return {
    origin: isProduction() 
      ? ['https://finvest.app', 'https://www.finvest.app'] 
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  sanitizeInput,
  formatResponse,
  handleError,
  generateId,
  delay,
  isProduction,
  corsOptions
};
