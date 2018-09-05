const prettyFormat = require('pretty-format')
const isHtml = require('is-html')
const {replaceSelectors} = require('./replace-selectors')
const {
  getNodes,
  markNodes,
  getSelectors,
  getStylesAndAllSelectors,
} = require('./utils')

// doing this to make it easier for users to mock things
// like switching between development mode and whatnot.
const getGlamorStyleSheet = () => require('@headspace/glamor').styleSheet

function createSerializer(styleSheet) {
  // eslint-disable-next-line complexity
  function test(val) {
    if (!val) {
      return false
    }
    return (
      isHtmlStringWithGlamorClasses(val) ||
      (!val.serializedWithJestGlamorReact &&
        (val.$$typeof === Symbol.for('react.test.json') ||
          (val instanceof HTMLElement && !isBeingSerialized(val))))
    )
  }

  function print(val, printer) {
    if (typeof val === 'string') {
      return fromHTMLString(val)
    }
    const nodes = getNodes(val)
    markNodes(nodes)
    const selectors = getSelectors(nodes)
    const {styles, allSelectors} = getStylesAndAllSelectors(
      selectors,
      styleSheet,
    )
    const printedVal = printer(val)
    // allows us to take multiple snapshots
    val.serializedWithJestGlamorReact = false
    if (styles) {
      return replaceSelectors(allSelectors, styles, printedVal)
    } else {
      return printedVal
    }
  }

  return {test, print}
}

function isBeingSerialized(node) {
  let currentNode = node

  while (currentNode) {
    if (currentNode.serializedWithJestGlamorReact) {
      return true
    }
    currentNode = currentNode.parentNode
  }
  return false
}

function isHtmlStringWithGlamorClasses(string) {
  // is-html was letting a "Snapshot Diff:" get through
  return (
    typeof string === 'string' &&
    string.startsWith('<') &&
    isHtml(string) &&
    string.includes('css-')
  )
}

function fromDOMNode(div, extract = r => r.children[0]) {
  const root = document.createElement('div')
  // not appending because we don't want to mess up the div they give us
  root.innerHTML = div.outerHTML
  const nodes = getNodes(root)
  const selectors = getSelectors(nodes)
  const {styles, allSelectors} = getStylesAndAllSelectors(
    selectors,
    getGlamorStyleSheet(),
  )
  return replaceSelectors(
    allSelectors,
    styles,
    prettyFormat(extract(root), {
      plugins: [
        prettyFormat.plugins.DOMElement,
        prettyFormat.plugins.DOMCollection,
      ],
    }),
  )
}

function fromHTMLString(string) {
  const div = document.createElement('div')
  div.innerHTML = string
  return fromDOMNode(div, root => root.children[0].children[0])
}

module.exports = Object.assign(createSerializer, {
  ...createSerializer(getGlamorStyleSheet),
  fromHTMLString,
  fromDOMNode,
})
