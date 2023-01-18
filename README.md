![master](https://github.com/Kontent-ai-Learn/kontent-ai-learn-web/actions/workflows/master_kcd-web-live-master(staging).yml/badge.svg)
![develop](https://github.com/Kontent-ai-Learn/kontent-ai-learn-web/actions/workflows/develop_kcd-web-live-dev(staging).yml/badge.svg)

# Kontent.ai Learn - Website

Kontent.ai Learn is an educational portal that uses [Kontent.ai](https://kontent.ai/) as a source of its content.

## Overview

1. The website is written in JavaScript.
1. It uses [express.js](https://expressjs.com/) framework for server-side rendering and [Kontent.ai Delivery SDK](https://github.com/kontent-ai/delivery-sdk-js) for content retrieval from Kontent.ai project.

## Setup

### Prerequisites

1. Node (+npm) installed
1. Any JavaScript IDE installed
1. Kontent.ai account and subscription

### Instructions

1. Clone the project repository.
1. Run `npm install` in the terminal.
1. Run `npm run debug` to start a development server.
1. The website will open in the browser on `http://localhost:3099` (proxying port `3000`).

#### Required environment variables

To start the application correctly, the following environment variables must be specified.

* `AUTH0_ISSUER_BASE_URL` - Auth0 Domain
* `AUTH0_CLIENT_ID` - Auth0 Client ID
* `AUTH0_LOGOUT_URL` - Relative URL the user is redirected to after logging out
* `AUTH0_DOMAIN` - Auth0 authentication domain
* `BASE_URL` - URL of the current environment (for example, <http://localhost:3000>) (used for webhooks pooling)
* `KONTENT_PROJECT_ID` - Kontent.ai project ID
* One of the following:
  * `KONTENT_PREVIEW_API_KEY` - Kontent.ai preview API key (set this key to retrieve preview content from Kontent.ai)
  * `KONTENT_SECURE_API_KEY` - Kontent.ai secured API key (set this key to retrieve published content from Kontent.ai)

#### Optional environment variables

Without the following variables, certain features will not work on the website.

* `ALIAS_URL` - URL specifying there the app is available, can be different from `baseUrl`
* `APP_URL` - URL specifying a Kontent.ai application related to the current environment
* `API2PDF_API_KEY` - API key for the [api2PDF](https://www.api2pdf.com/) service
* `APPINSIGHTS_INSTRUMENTATIONKEY` - Azure Application Insights key (used for application monitoring)
* `COSMOSDB_ENDPOINT` - CosmosDB database endpoint URL
* `COSMOSDB_KEY` - CosmosDB database authorization key
* `COSMOSDB_DATABASE` - CosmosDB database name
* `COSMOSDB_CONTAINER_SURVEY` - CosmosDB database - Surveys container name
* `COSMOSDB_CONTAINER_CERTIFICATION_ATTEMPT` - CosmosDB database - Certifications container name
* `COSMOSDB_CONTAINER_PROFILE` - CosmosDB database - Profile container name
* `COSMOSDB_CONTAINER_REPORTING` - CosmosDB database - Reporting (Scorm postback payloads) container name
* `GITHUB_REDOCLY_ACCESS_TOKEN` - Used for syncing site data to Redocly repository
* `GITHUB_REDOCLY_EMAIL` - Used for syncing site data to Redocly repository
* `GITHUB_REDOCLY_OWNER` - Used for syncing site data to Redocly repository
* `GITHUB_REDOCLY_REPOSITORY` - Used for syncing site data to Redocly repository
* `GITHUB_REDOCLY_USERNAME` - Used for syncing site data to Redocly repository
* `GITHUB_REDOCLY_BRANCH` - Used for syncing site data to Redocly repository
* `GTM_ID` - Google Tag Manager ID (used for analytics)
* `INTERCOM_ID` - Intercom account ID (used for support chat)
* `IS_PRODUCTION` - Flag that determines whether to show a red warning banner
* `JIRA_ISSUE_TYPE` - Jira Issue index (used for feedback form)
* `JIRA_PROJECT` - Jira Project codename (used for feedback form)
* `JIRA_TOKEN` - Jira API key (used for feedback form)
* `JIRA_USER` - User email for a Jira account (used for feedback form)
* `KONTENT_LANGUAGE_CODENAME_DEFAULT` Default language codename of the Kontent.ai project (used by the Management API)
* `KONTENT_MANAGEMENT_API_KEY` - Kontent.ai Management API key (used for manipulating content in the Kontent.ai project, ie. upserting Licensing page) 
* `KONTENT_WEBHOOK_SECRET` - Kontent.ai webhook token (used for common content cache invalidation)
* `LICENSES_ENDPOINT` - Source URL for content of the 3rd party licenses page
* `LICENSES_CODENAME` - Codename of the content item representing the 3rd party licenses page
* `NGROK` - NGROK tunnel URL (i.e. <https://91a2c81a7f1f.NGROK.io>) (useful for api2PDF service local development/testing)
* `RECAPTCHA_V2_SECRET` - Google Recaptcha v2 secret API key (used for forms robot protection)
* `RECAPTCHA_V2_SITE` - Google Recaptcha v2 site API key (used for forms robot protection)
* `SCORM_APP_ID` - Scorm Cloud Application ID
* `SCORM_SECRET_KEY`- Scorm Cloud Secret key
* `SCORM_HOST`- E-learning Scorm Cloud host URL
* `SCORM_USERNAME`- Scorm Cloud postback endpoint auth user name
* `SCORM_USERPWD`- Scorm Cloud postback endpoint auth user password
* `SEARCH_API_KEY` - Algolia search-only API key (used for site search)
* `SEARCH_APP_ID` - Algolia application ID (used for site search)
* `SEARCH_INDEX_NAME` - Index name in Algolia application (used for site search)
* `SENDGRID_API_KEY` - SendGrid API key (used for sending priority alerts via email)
* `SENDGRID_EMAIL_ADDRESS_FROM` - SendGrid sender email address (used for sending priority alerts via email)
* `SENDGRID_EMAIL_ADDRESS_TO` - SendGrid
* `SUBSCRIPTION_SERVICE_BEARER` - Subscription service access token for Kontent.ai (used for verifying users' access to e-learning)
* `SUBSCRIPTION_SERVICE_URL` - Subscription service URL (used for verifying users' access to e-learning)
* `SUBSCRIPTION_SERVICE_SERVICE_CHECK_EMAIL` - Email address that has an existing record in the Subscription service

## How To Contribute

Feel free to open a new issue where you describe your proposed changes, or even create a new pull request from your branch with proposed changes.

## License

All source code is published under MIT license.
