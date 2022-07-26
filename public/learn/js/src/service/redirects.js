const renderRedirects = (items) => {
  return `
    <h1>Active redirects</h1>
    <h2>Redirect rules</h2>
    <table border="1">
      <tr>
        <th>Redirect to</th>
        <th>Redirect from</th>
      </tr>
      ${items.rules.map(item => {
        const originalUrl = item.originalUrl;
        const redirectToUrl = originalUrl.includes('://') ? originalUrl : `/learn${originalUrl}`;
        return `
          <tr>
            <td>
              <a href="${redirectToUrl}" target="_blank">${redirectToUrl}</a>
            </td>
            <td>
              <ol>
                ${item.redirectUrls.map(elem => {
                  const url = `/learn${elem.url}`;
                  return `<li>
                            ${url}
                            <a href="https://app.kontent.ai/goto/edit-item/project/${items.projectId}/variant-codename/${items.language}/item/${elem.id}" target="_blank" rel="noopener">Edit</a>
                          </li>`;
                }).join('')}
              </ol>
            </td>
          </tr>
        `;
      }).join('')}
    </table>

    <h2>Redirect URLs for articles</h2>
    <table border="1">
      <tr>
        <th>Redirect to</th>
        <th>Redirect from</th>
      </tr>
      ${items.urls.map(item => {
        return `
          <tr>
            <td>
              <a href="${item.originalUrl}" target="_blank">${item.originalUrl}</a>
            </td>
            <td>
              <ol>
                ${item.redirectUrls.map(elem => {
                  const url = `/learn${elem}`;
                  return `<li>
                            ${url}
                            <a href="https://app.kontent.ai/goto/edit-item/project/${items.projectId}/variant-codename/${items.language}/item/${item.id}/element/redirect_urls" target="_blank" rel="noopener">Edit</a>  
                          </li>`;
                }).join('')}
              </ol>
            </td>
          </tr>
        `
      }).join('')}
    </table>
  `;
};