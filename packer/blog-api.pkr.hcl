packer {
    required_plugins {
        digitalocean = {
            version = ">=1.1.1"
            source = "github.com/digitalocean/digitalocean"
        }
    }
}

variable "do_token"{
    type = string 
    sensitive = true 
    default = env("DIGITALOCEAN_TOKEN")
}

variable "region" {
    type = string 
    default = "blr1"
}

variable "size" {
    type = string 
    default = "s-1vcpu-1gb"
}

variable "github_repo"{
    description = "HTTPS clone url of the repo containing app/ , packer/ and terraform/"
    type = string
    default = "https://github.com/ShivanshKumar750/blog-api-infra.git"
}

variable "github_branch" {
    type = string 
    default = "master"
}

locals {
    timestamp = formatdate("YYYYMMDD-hhmmss",timestamp())
}

source "digitalocean" "blog_api" {
    api_token = var.do_token
    image = "ubuntu-24-04-x64"
    region = var.region
    size = var.size 
    ssh_username = "root"
    snapshot_name = "blog-api-${local.timestamp}"
    snapshot_region = [var.region]
    tags = ["packer","blog-api-build"]
}

build {
    name = "blog-api"
    sources = ["source.digitalocean.blog_api"]
    provisioner "shell" {
    script          = "scripts/provision.sh"
    execute_command = "chmod +x {{ .Path }}; {{ .Vars }} {{ .Path }}"
    environment_vars = [
      "GITHUB_REPO=${var.github_repo}",
      "GITHUB_BRANCH=${var.github_branch}",
      "GITHUB_TOKEN=${var.github_token}",
    ]
  }
}
