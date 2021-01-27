const smartLink = {
  projectId: () => {
    return { 'data-kontent-project-id': process.env['KC.ProjectId'] }
  },
  projectLanguage: (codename) => {
    return { 'data-kontent-language-codename': codename }
  },
  elementCodename: (codename) => {
    return { 'data-kontent-element-codename': codename }
  },
  itemId: (id) => {
    return { 'data-kontent-item-id': id }
  },
  componentId: (id) => {
    return { 'data-kontent-component-id': id }
  }
}

module.exports = smartLink;
