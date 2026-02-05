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
    .route(
      "/api/ruleset",
      axum::routing::post(backend::api::ruleset::create_ruleset)
        .get(backend::api::ruleset::list_rulesets)
        .put(backend::api::ruleset::update_ruleset)
        .delete(backend::api::ruleset::delete_ruleset),
    )
    .route(
      "/api/inbound",
      axum::routing::post(backend::api::inbound::create_inbound)
        .get(backend::api::inbound::list_inbounds)
        .put(backend::api::inbound::update_inbound)
        .delete(backend::api::inbound::delete_inbound),
    )
    .route(
      "/api/experimental",
      axum::routing::post(backend::api::experimental::create_experimental)
        .get(backend::api::experimental::list_experimentals)
        .put(backend::api::experimental::update_experimental)
        .delete(backend::api::experimental::delete_experimental),
    )
    .route(
      "/api/subscribe",
      axum::routing::post(backend::api::subscribe::create_subscribe)
        .get(backend::api::subscribe::list_subscribes)
        .put(backend::api::subscribe::update_subscribe)
        .delete(backend::api::subscribe::delete_subscribe),
    )
    .route(
      "/api/subscribe/refresh",
      axum::routing::post(backend::api::subscribe::refresh_subscribe),
    )
    .route(
      "/api/dns-server",
      axum::routing::post(backend::api::dns::create_dns)
        .get(backend::api::dns::list_dns)
        .put(backend::api::dns::update_dns)
        .delete(backend::api::dns::delete_dns),
    )
    .route(
      "/api/dns-config",
      axum::routing::post(backend::api::dns_config::create_dns_config)
        .get(backend::api::dns_config::list_dns_configs)
        .put(backend::api::dns_config::update_dns_config)
        .delete(backend::api::dns_config::delete_dns_config),
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
