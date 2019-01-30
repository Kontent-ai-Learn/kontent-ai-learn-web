| [master](https://github.com/Kentico/kentico-cloud-docs-web/tree/master) | [develop](https://github.com/Kentico/kentico-cloud-docs-web/tree/develop) |
|:---:|:---:|
| [![Build Status](https://travis-ci.org/Kentico/kentico-cloud-docs-web.svg?branch=master)](https://travis-ci.org/Kentico/kentico-cloud-docs-web/branches) [![codebeat badge](https://codebeat.co/badges/64e909ff-b9e2-42e6-84df-6f3509ee3afa)](https://codebeat.co/projects/github-com-kentico-kentico-cloud-docs-web-master) | [![Build Status](https://travis-ci.org/Kentico/kentico-cloud-docs-web.svg?branch=develop)](https://travis-ci.org/Kentico/kentico-cloud-docs-web/branches) [![codebeat badge](https://codebeat.co/badges/4e003da5-2d76-45bd-a137-c71bd80e8c1c)](https://codebeat.co/projects/github-com-kentico-kentico-cloud-docs-web-develop) |

# Kentico Cloud Documentation - Website

Kentico Cloud documentation portal, which utilizes [Kentico Cloud](https://app.kenticocloud.com/) as a source of its content.

## Overview
1. The website is written in JavaScript.
2. It uses [express.js](https://expressjs.com/) framework for server-side rendering and [Kentico Cloud Delivery SDK](https://github.com/Kentico/kentico-cloud-js/tree/master/packages/delivery) for content retrieval from Kentico Cloud project.
3. Additionally, [Autocomplete.js](https://github.com/algolia/autocomplete.js) package supports the search box that is connected to the indexed content on Algolia.

## Setup

### Prerequisites
1. Node (+npm) installed
2. Any JavaScript IDE installed
2. Subscription on Kentico Cloud

### Instructions
1. Clone the project repository.
2. Run `npm install` in the terminal.
3. Run `npm start` to start a development server.
4. The website can be opened in your browser at http://localhost:3000.

#### Required Keys
* `KC.ProjectId` - Kentico Cloud project ID
* `KC.PreviewApiKey` - Kentico Cloud preview API key (set this key to retrieve preview content from Kentico Cloud)
* `Search.ApiKey` - Algolia search-only API key
* `Search.AppId` - Algolia application ID
* `Search.IndexName` - Index name in Algolia application
* `APPINSIGHTS_INSTRUMENTATIONKEY` - Application Insights key

## How To Contribute
Feel free to open a new issue where you describe your proposed changes, or even create a new pull request from your branch with proposed changes.

## Licence
All the source codes are published under MIT licence.
