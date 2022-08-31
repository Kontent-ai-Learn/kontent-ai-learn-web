const smartLink = {
  projectId: () => {
    return { 'data-kontent-project-id': process.env.KONTENT_PROJECT_ID }
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
  },
  undecided: (id) => {
    return { 'data-kontent-undecided': id }
  },
}

module.exports = smartLink;
