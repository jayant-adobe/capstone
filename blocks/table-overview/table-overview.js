/*
 * Table (overview) Block — variant of the Block Collection table block.
 * Renders a labelled key -> value specification list (e.g. adventure overview:
 * Activity / Adventure Type / Trip Length / Group Size / Difficulty / Price).
 * Intended for the WKND adventure-detail "no header" 2-column (label | value) model.
 * https://www.aem.live/developer/block-collection/table
 */

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const header = !block.classList.contains('no-header');

  [...block.children].forEach((row, i) => {
    const tr = document.createElement('tr');

    [...row.children].forEach((cell) => {
      const td = document.createElement(i === 0 && header ? 'th' : 'td');

      if (i === 0 && header) td.setAttribute('scope', 'col');
      td.innerHTML = cell.innerHTML;
      tr.append(td);
    });
    if (i === 0 && header) thead.append(tr);
    else tbody.append(tr);
  });
  table.append(thead, tbody);
  block.replaceChildren(table);
}
