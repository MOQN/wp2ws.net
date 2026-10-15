let params = {
 fps: 0,
 particleNumber: 500
};


let pane;


function setupGUI() {
 pane = new Pane();
 pane.addBinding(params, "fps", {
   label: "FPS",
   readonly: true,
 });
 pane.addBinding(params, "fps", {
   label: "FPS Graph",
   readonly: true,
   view: "graph",
   min: 0,
   max: 120,
 });
 pane.addBlade({ view: "separator" });


 pane.addBinding(params, "particleNumber", {
   min: 0,
   max: MAX_RAINDROPS,
   step: 1,
 });
}


function updateGUI() {
 //


 pane.refresh();
}
