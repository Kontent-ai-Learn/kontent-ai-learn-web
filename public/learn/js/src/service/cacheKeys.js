const renderCacheKeys = (items) => {
  return `
    <table>
      ${items.keys.map(item => {
        let name = item.split('_'); 
        if (name.length > 1) { 
          name.length = name.length - 1;
        } 
        name = name.join('_');
        return `
          <tr>
            <td>${name}</td>
            <td>
              <a href="/learn/service/keys/${item}" target="blank">Inspect</a>
            </td>
            <td>
              <a data-request href="/learn/service/keys/${item}/invalidate">Invalidate</a>
            </td>
          </tr>
        `;
      }).join('')}
    </table>
  `;
};

const renderCacheKeyDetail = (item) => {
  return `${helper.encodeHTMLEntities(JSON.stringify(item)).replace(/\\n/g, '<br>').replace(/ /g, '&nbsp;')}`;
};