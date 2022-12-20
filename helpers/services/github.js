const { Octokit } = require('octokit');
const axios = require('axios');

const createOrUpdateFileAsync = async (data) => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_REDOCLY_ACCESS_TOKEN
  });

  const contentInBase64 = Buffer.from(data.content).toString('base64');
  let sha;
  let existingContent;

  try {
    const existingFileResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: process.env.GITHUB_REDOCLY_OWNER,
        repo: process.env.GITHUB_REDOCLY_REPOSITORY,
        path: data.filePath,
        ref: process.env.GITHUB_REDOCLY_BRANCH,
    });

    const responseData = existingFileResponse.data;

    if (responseData.sha) {
      sha = responseData.sha;
    }

    if (responseData.content) {
      existingContent = responseData.content;

      // remove line ending so that we can compare old & new content
      if (existingContent && existingContent.endsWith('\n')) {
          existingContent = existingContent.substring(0, existingContent.length - 1);
      }
  }
  } catch (err) {
      if (err && err.status === 404) {
        // file does not yet exists, that's fine
    } else {
        // other error
        throw err;
    }
  }

  const existingContentDecoded = Buffer.from(existingContent ?? '', 'base64').toString();
  const newContentDecoded = Buffer.from(contentInBase64 ?? '', 'base64').toString();

  // only update file if the content changed
  if (existingContentDecoded !== newContentDecoded) {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: process.env.GITHUB_REDOCLY_OWNER,
      repo: process.env.GITHUB_REDOCLY_REPOSITORY,
      path: data.filePath,
      message: data.commitMessage,
      branch: process.env.GITHUB_REDOCLY_BRANCH,
      committer: {
        name: process.env.GITHUB_REDOCLY_USERNAME,
        email: process.env.GITHUB_REDOCLY_EMAIL
      },
      mediaType: {},
      sha: sha,
      content: contentInBase64
    });
  }
};

const requestRedoclySync = async () => {
  await axios.post(`${process.env.BASE_URL}/learn/api/redocly/sync/`, {});
};

const github = { createOrUpdateFileAsync, requestRedoclySync };

module.exports = github;
