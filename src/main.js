const Renderer = require('html_renderer_for_nw');
const axios = require('axios');

const fs = window.require('fs');
const path = window.require('path');
const electron = require('electron');

const r = new Renderer('app');

const rowsFilePath = path.join(window.__dirname, '..', '..', '..', 'rows.json');

function getCurrencyes() {
  axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json').then((response) => {
    r.store = { ...r.store, currencyList: [ { 
      cc: "UAH",
      exchangedate: response.data[0].exchangedate,
      r030: 980,
      rate: 1,
      txt: "Гривня",
    }, ...response.data ] }
    loadSawedData();
  });
}

function setSumm(event, currency) {
  let sum = parseFloat(event.target.value) * currency.rate;
  r.store = { ...r.store, totalSum: sum }
}

function getValue(currency) {
  let sum = r.store.totalSum || 0;
  if (currency.rate)
    return sum / currency.rate;
  return 0;
}

function addNewRow() {
  let rows = r.store.rows ? [...r.store.rows] : [];
  rows.push(r.store.currencyList[0]);
  r.store = { ...r.store, rows };
}

function changeCurrency(index, currencyKey) {
  let currentCurrency = r.store.currencyList.find((currency) => currency.cc === currencyKey);
  if (currentCurrency) {
    let rows = r.store.rows ? [...r.store.rows] : [];
    rows[index] = currentCurrency;
    r.store = { ...r.store, rows };
  }
}

function onSaveData() {
  // console.log(electron);
  if (r.store.rows) {
    let data = [...r.store.rows].map((el) => el.cc);
    fs.writeFileSync(rowsFilePath, JSON.stringify(data, null, 2));
  }
}

function loadSawedData() {
  if (fs.existsSync(rowsFilePath)) {
    let data = []
    let rows = [];
    try {
      data = JSON.parse(fs.readFileSync(rowsFilePath));
    } catch (err) {
      data = [];
    }

    data.forEach((el) => {
      let currentCurrency = r.store.currencyList.find((currency) => currency.cc === el);
      rows.push(currentCurrency);
    });
    r.store = { ...r.store, rows };
  }
}

window.onload = function () {
  getCurrencyes();
  r.render(() => r.$('div', { class: 'div' },
    r.$('div', { class: 'div' },
      r.$('button', { class: 'button', onClick: addNewRow }, 'Додати'),
      r.$('button', { class: 'button', onClick: onSaveData }, 'Зберегти'),
      r.store.currencyList &&
      r.$('table', { class: 'table' },
        r.$('tr', { class: 'tr' }, 
          ['Валюта', 'Курс', 'Сумма'].map((colName) =>
            r.$('th', { class: 'th' }, colName) 
          ),
        ),
        r.store.rows &&
        r.store.rows.map((row, index) => 
          r.$('tr', { class: 'tr' }, 
            r.$('td', { class: 'td' }, 
              r.$('select', { class: 'select', onChange: (e) => changeCurrency(index, e.target.value)}, 
                r.store.currencyList.map((currency) => {
                  let optionAttributes = { class: 'option', value: currency.cc };
                  if (row.cc === currency.cc)
                    optionAttributes['selected'] = true;
                  return r.$('option', optionAttributes, currency.txt)
                }) 
              )
            ),
            r.$('td', { class: 'td' }, row.rate),
            r.$('td', { class: 'td' }, r.$('input', { class: 'input', type: 'number', onChange: (e) => setSumm(e, row), value: getValue(row)})),
          )
        ),
      ),
    ),
  ));
}