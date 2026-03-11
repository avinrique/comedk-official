const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    errors = [{ field, message: `${field} already exists` }];
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
