use axum::{Router, routing::get_service};
use std::net::SocketAddr;
use tower_http::services::{ServeDir, ServeFile};

mod backend;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  // 设置日志级别
  if std::env::var("RUST_LOG").is_err() {
    unsafe {
      std::env::set_var("RUST_LOG", "info");
    }
  }
  env_logger::init();

  // 构建静态文件服务（用于 serve ./web 目录）
  let serve_dir = ServeDir::new("./web").not_found_service(ServeFile::new("./web/index.html"));

  let app = Router::new()
    .route(
      "/api/log",
      axum::routing::post(backend::api::log::create_log)
        .get(backend::api::log::list_logs)
        .put(backend::api::log::update_log)
        .delete(backend::api::log::delete_log),
    )
    .fallback_service(get_service(serve_dir));

  // 从环境变量读取端口，默认为 3005
  let port = std::env::var("PORT")
    .ok()
    .and_then(|p| p.parse::<u16>().ok())
    .unwrap_or(3005);

  let addr = SocketAddr::from(([0, 0, 0, 0], port));
  let listener = tokio::net::TcpListener::bind(addr).await?;
  log::info!("Server starting on port {}", port);
  axum::serve(listener, app).await?;

  Ok(())
}
