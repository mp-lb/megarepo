locals {
  docs_domain = var.docs_domain != "" ? var.docs_domain : "${var.project_name}.${var.domain}"
}

resource "vercel_project" "docs" {
  name             = "${var.project_name}-docs"
  build_command    = null
  output_directory = null
}

resource "vercel_project_domain" "docs" {
  project_id = vercel_project.docs.id
  domain     = local.docs_domain
}
