let uuid = 0

export default () => {
  let result = uuid++

  if (result >= Number.MAX_SAFE_INTEGER) {
    result = uuid = 0
  }

  return result
}