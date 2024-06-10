export const getAssetImage = (fileName: string) => {
  const img = new window.Image()
  img.src = require(`../assets/${fileName}`)
  return img
}
