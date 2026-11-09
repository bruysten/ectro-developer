export function removeDatasetColumn(dataset,name){
 if(!dataset.columns.some(column=>column.name===name))throw Error('Diese Spalte ist nicht mehr vorhanden.');
 const columns=dataset.columns.filter(column=>column.name!==name);
 return {columns,rows:columns.length?dataset.rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!==name))):[]};
}
