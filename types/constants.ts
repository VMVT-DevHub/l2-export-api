import _ from 'lodash';

export function queryBoolean(field: string, value: boolean = false) {
  let fieldValue = `${_.snakeCase(field)} IS`;
  if (!value) {
    fieldValue += ' NOT';
  }
  return { $raw: `${fieldValue} TRUE` };
}
