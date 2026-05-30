output "docs_url" {
  description = "Published docs URL"
  value       = "https://${local.docs_domain}"
}

output "vercel_project_id" {
  description = "Vercel project ID for CLI deployments"
  value       = vercel_project.docs.id
}

output "docs_dns_record" {
  description = "Docs DNS record to configure when DNS is managed outside Terraform"
  value = {
    name    = local.docs_domain
    type    = var.docs_dns_record_type
    content = var.docs_dns_record_content
  }
}
