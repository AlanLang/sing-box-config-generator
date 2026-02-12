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

  // 运行数据迁移（在接受请求前完成）
  backend::migration::run_migrations().await?;

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
      "/api/ruleset/options",
      axum::routing::get(backend::api::ruleset::get_ruleset_options),
    )
    .route(
      "/api/rule",
      axum::routing::post(backend::api::rule::create_rule)
        .get(backend::api::rule::list_rules)
        .put(backend::api::rule::update_rule)
        .delete(backend::api::rule::delete_rule),
    )
    .route(
      "/api/route",
      axum::routing::post(backend::api::route::create_route)
        .get(backend::api::route::list_routes)
        .put(backend::api::route::update_route)
        .delete(backend::api::route::delete_route),
    )
    .route(
      "/api/inbound",
      axum::routing::post(backend::api::inbound::create_inbound)
        .get(backend::api::inbound::list_inbounds)
        .put(backend::api::inbound::update_inbound)
        .delete(backend::api::inbound::delete_inbound),
    )
    .route(
      "/api/outbound",
      axum::routing::post(backend::api::outbound::create_outbound)
        .get(backend::api::outbound::list_outbounds)
        .put(backend::api::outbound::update_outbound)
        .delete(backend::api::outbound::delete_outbound),
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
      "/api/subscribe/outbounds",
      axum::routing::get(backend::api::subscribe::get_subscribe_outbounds),
    )
    .route(
      "/api/subscribe/reorder",
      axum::routing::post(backend::api::subscribe::reorder_subscribes),
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
    .route(
      "/api/filter",
      axum::routing::post(backend::api::filter::create_filter)
        .get(backend::api::filter::list_filters)
        .put(backend::api::filter::update_filter)
        .delete(backend::api::filter::delete_filter),
    )
    .route(
      "/api/outbound-group",
      axum::routing::post(backend::api::outbound_group::create_outbound_group)
        .get(backend::api::outbound_group::list_outbound_groups)
        .put(backend::api::outbound_group::update_outbound_group)
        .delete(backend::api::outbound_group::delete_outbound_group),
    )
    .route(
      "/api/outbound-group/options",
      axum::routing::get(backend::api::outbound_group::get_available_options),
    )
    .route(
      "/api/outbound-group/reorder",
      axum::routing::post(backend::api::outbound_group::reorder_outbound_groups),
    )
    .route(
      "/api/config",
      axum::routing::post(backend::api::config::create_config)
        .get(backend::api::config::list_configs)
        .put(backend::api::config::update_config)
        .delete(backend::api::config::delete_config),
    )
    .route(
      "/api/backup",
      axum::routing::post(backend::api::backup::create_backup)
        .get(backend::api::backup::list_backups)
        .delete(backend::api::backup::delete_backup),
    )
    .route(
      "/api/backup/restore",
      axum::routing::post(backend::api::backup::restore_backup),
    )
    .route(
      "/api/backup/upload",
      axum::routing::post(backend::api::backup::upload_backup),
    )
    .route(
      "/api/backup/current-hash",
      axum::routing::get(backend::api::backup::current_hash),
    )
    .route(
      "/api/backup/download/{uuid}",
      axum::routing::get(backend::api::backup::download_backup),
    )
    .route(
      "/download/{uuid}",
      axum::routing::get(backend::api::config_generator::generate_config),
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
