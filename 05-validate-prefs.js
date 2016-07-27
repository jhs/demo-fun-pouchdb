module.exports = validate_preferences

var OK_COLORS = ['blue', 'red', 'green']

function validate_preferences(doc) {
  if (doc.color) {
    if (OK_COLORS.indexOf(doc.color) == -1)
      throw new Error(`Bad color: ${doc.color}`)
  }

  if (typeof doc.timezone == 'undefined')
    ; // Leaving it blank is fine.
  else if (typeof doc.timezone != 'number')
    throw new Error(`Bad timezone setting: ${doc.timezone}`)
}
