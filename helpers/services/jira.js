const axios = require('axios');
const errorAppInsights = require('../error/appInsights');

const settings = {
    auth: {
        username: process.env.JIRA_USER || '',
        password: process.env.JIRA_TOKEN || ''
    },
    headers: {
        Accept: 'application/json'
    },
    issueUrl: 'https://kentico.atlassian.net/rest/api/2/issue'
};

const jira = {
    createIssue: async (data) => {
        const issue = {
            fields: {
               project:
               {
                  key: process.env.JIRA_PROJECT || ''
               },
               summary: 'KCD Feedback submission',
               description: `h2. Feedback\n\n${data.feedback}\n\nh2. Context\n\nUser: ${data.email}\nDocs: ${data.url}\n`,
               issuetype: {
                  id: parseInt(process.env.JIRA_ISSUE_TYPE) || 11600
               }
           }
        };

        // Create a issue in Jira
        try {
            await axios({
                method: 'post',
                url: settings.issueUrl,
                data: issue,
                auth: settings.auth,
                headers: settings.headers
            });
        } catch (error) {
            errorAppInsights.log('JIRA_ERROR', error);
        }
    }
}

module.exports = jira;
