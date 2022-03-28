![master](https://github.com/KenticoDocs/kontent-docs-web/actions/workflows/master_kcd-web-live-master(staging).yml/badge.svg)
![develop](https://github.com/KenticoDocs/kontent-docs-web/actions/workflows/develop_kcd-web-live-dev(staging).yml/badge.svg)

# Kontent Learn - Website

Kontent Learn is an educational portal that uses [Kontent by Kentico](https://app.kontent.ai/) as a source of its content.

## Overview

1. The website is written in JavaScript.
1. It uses [express.js](https://expressjs.com/) framework for server-side rendering and [Kentico Kontent Delivery SDK](https://github.com/Kentico/kontent-delivery-sdk-js) for content retrieval from Kentico Kontent project.

## Setup

### Prerequisites

1. Node (+npm) installed
1. Any JavaScript IDE installed
1. Kontent account and subscription

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
* `baseURL` - URL of the current environment (for example, http://localhost:3000) (used for webhooks pooling)
* `KC.ProjectId` - Kentico Kontent project ID
* One of the following:
  * `KC.PreviewApiKey` - Kentico Kontent preview API key (set this key to retrieve preview content from Kentico Kontent)
  * `KC.SecuredApiKey` - Kentico Kontent secured API key (set this key to retrieve published content from Kentico Kontent)

#### Optional environment variables

Without the following variables, certain features will not work on the website.

* `aliasUrl` - URL specifying there the app is available, can be different from `baseUrl`
* `appUrl` - URL specifying Kontent application related to the current environment
* `Api2Pdf.ApiKey` - API key for the [api2PDF](https://www.api2pdf.com/) service
* `APPINSIGHTS_INSTRUMENTATIONKEY` - Azure Application Insights key (used for application monitoring)
* `GTM.id` - Google Tag Manager ID (used for analytics)
* `Hotjar.id` - Hotjar application ID (used for analytics)
* `Intercom.id` - Intercom account ID (used for support chat)
* `isProduction` - Flag that determines whether to show a red warning banner
* `Jira.IssueType` - Jira Issue index (used for feedback form)
* `Jira.Project` - Jira Project codename (used for feedback form)
* `Jira.Token` - Jira API key (used for feedback form)
* `Jira.User` - User email for a Jira account (used for feedback form)
* `LMS.host` - Kentico e-learning URL of the LMS
* `LMS.id` - Kentico e-learning API key (used for e-learning integration)
* `SCORM_APP_ID` - Scorm Cloud Application ID
* `SCORM_SECRET_KEY`- Scorm Cloud Secret key
* `SCORM_HOST`- Kentico e-learning Scorm Cloud host URL
* `ngrok` - ngrok tunnel URL (i.e. https://91a2c81a7f1f.ngrok.io) (useful for api2PDF service local development/testing)
* `Recaptcha.v2.secret` - Google Recaptcha v2 secret API key (used for forms robot protection)
* `Recaptcha.v2.site` - Google Recaptcha v2 site API key (used for forms robot protection)
* `referenceRenderUrl` - Required for the REST API references based on ReDoc
* `Search.ApiKey` - Algolia search-only API key (used for site search)
* `Search.AppId` - Algolia application ID (used for site search)
* `Search.IndexName` - Index name in Algolia application (used for site search)
* `SENDGRID_API_KEY` - SendGrid API key (used for sending priority alerts via email)
* `SENDGRID_EMAIL_ADDRESS_FROM` - SendGrid sender email address (used for sending priority alerts via email)
* `SENDGRID_EMAIL_ADDRESS_TO` - SendGrid 
* `SubscriptionService.Bearer` - Subscription service access token for Kentico Kontent (used for verifying users' access to e-learning)
* `SubscriptionService.Url` - Subscription service URL (used for verifying users' access to e-learning)
* `SubscriptionService.ServiceCheckerEmail` - Email address that has an existing record in the Subscription service
* `Webhook.Cache.Invalidate.CommonContent` - Kentico Kontent Webhook token (used for common content cache invalidation)

## How To Contribute

Feel free to open a new issue where you describe your proposed changes, or even create a new pull request from your branch with proposed changes.

## Licence

All source code is published under MIT licence.
