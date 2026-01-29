export function formatDate(date, format) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  if (format === 'ISO') return d.toISOString()
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  return format
    .replace('MM', month)
    .replace('DD', day)
    .replace('YYYY', year)
}
