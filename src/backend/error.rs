use axum::{
  http::StatusCode,
  response::{IntoResponse, Response},
};

// Make our own error that wraps different error types
pub enum AppError {
  NotFound(String),
  InternalServerError(String),
  AnyhowError(anyhow::Error),
}

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for AppError {
  fn into_response(self) -> Response {
    match self {
      AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg).into_response(),
      AppError::InternalServerError(msg) => {
        (StatusCode::INTERNAL_SERVER_ERROR, msg).into_response()
      }
      AppError::AnyhowError(err) => (
        StatusCode::INTERNAL_SERVER_ERROR,
        format!("Something went wrong: {}", err),
      )
        .into_response(),
    }
  }
}

// This enables using `?` on functions that return `Result<_, anyhow::Error>` to turn them into `Result<_, AppError>`.
// That way you don't need to do that manually.
impl<E> From<E> for AppError
where
  E: Into<anyhow::Error>,
{
  fn from(err: E) -> Self {
    Self::AnyhowError(err.into())
  }
}
