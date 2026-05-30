resource "cloudflare_record" "docs" {
  count   = var.manage_cloudflare_dns ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = local.docs_domain
  content = var.docs_dns_record_content
  type    = var.docs_dns_record_type
  proxied = false
  ttl     = 1
}
