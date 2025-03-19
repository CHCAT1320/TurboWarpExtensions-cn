async function fetchDataAndProcess() {
    let data;
    try {
      const response = await fetch('https://chcat1320.github.io/TurboWarpExtensions-cn/info.json');
      data = await response.json();
    } catch (error) {
      console.error('Error:', error);
    }
    return data;
  }
  
var jsonData

fetchDataAndProcess().then(data => {
jsonData = data;
console.log(jsonData);
main()
});

function main(){
  var extensionsList = document.getElementById("extensionsList")
  for(let i = 0;i < jsonData.extensions.length;i++){
    //for(let i = 0;i < 10;i++){
    var newExtension = document.createElement('div')
    newExtension.id = "extensionsBox"
    newExtension.innerHTML = `<img src="./svg/${jsonData.extensions[i].img}" style="width: 300px;height: 150px;"/>` + jsonData.extensions[i].name+
    `<br>${jsonData.extensions[i].info}`+
    `<br>by: ${jsonData.extensions[i].by}`
    newExtension.onclick = function() {
      window.open(`./extensions/${jsonData.extensions[i].name}.js`, '_blank');
    };
    extensionsList.appendChild(newExtension)
    console.log(i)
  }
}
