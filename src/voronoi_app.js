import {defined,html} from "./web-js-utils.js"
import {Svg} from "./svg_utils.js"
import {voronoi_diag} from "./voronoi_diag.js"
import {Seeds} from "./seeds.js"
import { Shape } from "./shape.js"

class voronoi_app{
    constructor(){
        let [w,h] = ["100%","100%"]
        let parent = document.createElement("template")
        this.parent = parent
        //const use_storage = false
        let init_needed = false
        //---------------------------------------------------
        //---------------------------------------------------
        this.version = "76"
        //---------------------------------------------------
        //---------------------------------------------------
        // Animation state
        this.animating = false
        this.animation_frame_id = null
        this.last_animation_time = 0
        this.animation_throttle = 16 // milliseconds (~60fps)
        
        // Autonomous animation state
        this.auto_animate = false
        this.auto_animation_id = null
        this.animation_speed = 0.3
        this.animation_intensity = 15
        this.animation_size_variance = 0.1
        this.seed_velocities = []
        this.seed_targets = []
        const config = JSON.parse(localStorage.getItem("voronoi_config"))
        if(config === null){
            console.log("First time usage, no config stored")
            init_needed = true
        }else{
            if(config.version == this.version){
                console.log(`same version ${this.version}, loading`)
                //console.log(config)
                Object.assign(this,config)
            }else{
                console.log(`version mismatch (localstorage = ${config.version} , loaded page = ${this.version}) reinitialising`)
                init_needed = true
            }
        }

        if(init_needed){
            this.cell_debug = 0;
            this.min_edge = 6
            this.is_color = false//not usable yet as flickers on updates
            this.width = 920
            this.height = 480
            this.cells_shape = "cubic"
            this.cells_space = 2
            this.use_unit = false
            this.unit_ratio = 3.7795
            this.unit_ratio_default = 3.7795
            this.view_svg = {
                cells:true,
                edges:false,
                seeds:true,
                shape:true
            }
            this.mouse_action = "move"
            this.export_ratio = 1.0
            this.export_svg = {
                cells:true,
                edges:false,
                seeds:false,
                shape:true
            }
        }
        this.shape = new Shape()
        this.diagram = new voronoi_diag(this.shape)
        this.seeds = new Seeds(this.shape)
        if(!init_needed){
            this.seeds.config = JSON.parse(localStorage.getItem("seeds_config"))
            this.shape.config = JSON.parse(localStorage.getItem("shape_config"))
            this.diagram.config = JSON.parse(localStorage.getItem("diag_config"))
        }

        this.svg = {}
        this.svg.main = html(parent,/*html*/`<svg id="main_svg" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"></svg>`);
        this.shape.update({parent:this.svg.main})
        this.svg.seeds_area = null;


        this.init_events()
    }
    
    set_parent(new_parent,width,height){
        //this.svg.main.parentElement.removeChild(this.svg.main)
        new_parent.appendChild(this.svg.main)
        this.svg.main.setAttributeNS(null,"width",width)
        this.svg.main.setAttributeNS(null,"height",height)
    }

    set_parent_only(new_parent){
        new_parent.appendChild(this.svg.main)
    }

    element(){
        return this.svg.main
    }

    clear_svg(svg_el){
        let children = [ ...svg_el.children];
        children.forEach((child)=>{
            child.parentElement.removeChild(child)
        })
    }

    draw_svg(svg_el,draw_cfg){
        this.clear_svg(svg_el)
        if(draw_cfg.shape){
            this.shape.draw(svg_el)
        }
        if(draw_cfg.cells){
            const params = {
                svg:svg_el,
                shape:this.cells_shape,
                color:this.is_color,
                min_edge:this.min_edge,
                retraction:this.cells_space,
                debug:this.cell_debug
            }
            this.diagram.draw_cells(params)
        }
        if(draw_cfg.edges){
            this.diagram.draw_edges({svg:svg_el})
        }
        if(draw_cfg.seeds){
            this.seeds.draw({svg:svg_el})
        }
        this.store()
    }


    draw(){
        this.draw_svg(this.svg.main,this.view_svg)
    }

    store(){
        localStorage.setItem("seeds_config",JSON.stringify(this.seeds.config))
        localStorage.setItem("shape_config",JSON.stringify(this.shape.config))
        localStorage.setItem("diag_config",JSON.stringify(this.diagram.config))
        let config = Object.assign({},this)
        delete config.parent
        delete config.svg
        delete config.seeds
        delete config.diagram
        delete config.shape
        //console.log(`storing config version ${config.version}`)
        localStorage.setItem("voronoi_config",JSON.stringify(config))
    }

    compute_voronoi(){
        this.diagram.compute(this.seeds.get_seeds(),{xl:0, xr:parseFloat(this.width), yt:0, yb:parseFloat(this.height)})
        this.draw()
    }

    compute_voronoi_smooth(){
        const currentTime = Date.now()
        if(currentTime - this.last_animation_time >= this.animation_throttle){
            this.last_animation_time = currentTime
            if(this.animation_frame_id){
                cancelAnimationFrame(this.animation_frame_id)
            }
            this.animation_frame_id = requestAnimationFrame(() => {
                this.diagram.compute(this.seeds.get_seeds(),{xl:0, xr:parseFloat(this.width), yt:0, yb:parseFloat(this.height)})
                this.draw()
                this.animation_frame_id = null
            })
        }
    }

    init_seed_animation(){
        const seeds = this.seeds.get_seeds()
        this.seed_velocities = []
        this.seed_targets = []
        
        for(let i = 0; i < seeds.length; i++){
            // Initialize with random velocity
            this.seed_velocities.push({
                vx: (Math.random() - 0.5) * this.animation_speed,
                vy: (Math.random() - 0.5) * this.animation_speed
            })
            // Set initial target as current position
            this.seed_targets.push({
                x: seeds[i].x,
                y: seeds[i].y,
                original_x: seeds[i].x,
                original_y: seeds[i].y
            })
        }
    }

    animate_seeds(){
        if(!this.auto_animate) return
        
        const seeds = this.seeds.get_seeds()
        const w = parseFloat(this.width)
        const h = parseFloat(this.height)
        
        // Ensure velocities are initialized
        if(this.seed_velocities.length !== seeds.length){
            this.init_seed_animation()
        }
        
        for(let i = 0; i < seeds.length; i++){
            const seed = seeds[i]
            const vel = this.seed_velocities[i]
            const target = this.seed_targets[i]
            
            // Update position with velocity
            seed.x += vel.vx
            seed.y += vel.vy
            
            // Keep seeds within bounds with soft boundaries
            const margin = 20
            if(seed.x < margin || seed.x > w - margin){
                vel.vx *= -0.8 // Bounce with damping
                seed.x = Math.max(margin, Math.min(w - margin, seed.x))
            }
            if(seed.y < margin || seed.y > h - margin){
                vel.vy *= -0.8
                seed.y = Math.max(margin, Math.min(h - margin, seed.y))
            }
            
            // Add organic movement - drift toward a moving target
            const time = Date.now() * 0.001
            const drift_x = Math.sin(time * 0.5 + i * 0.5) * this.animation_intensity
            const drift_y = Math.cos(time * 0.7 + i * 0.3) * this.animation_intensity
            
            target.x = target.original_x + drift_x
            target.y = target.original_y + drift_y
            
            // Apply force toward target
            const dx = target.x - seed.x
            const dy = target.y - seed.y
            const force = 0.02
            
            vel.vx += dx * force
            vel.vy += dy * force
            
            // Add slight randomness for more organic feel
            vel.vx += (Math.random() - 0.5) * 0.05
            vel.vy += (Math.random() - 0.5) * 0.05
            
            // Apply damping to prevent excessive speed
            vel.vx *= 0.95
            vel.vy *= 0.95
            
            // Limit maximum velocity
            const max_vel = 2.0
            const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy)
            if(speed > max_vel){
                vel.vx = (vel.vx / speed) * max_vel
                vel.vy = (vel.vy / speed) * max_vel
            }
        }
        
        // Compute and redraw
        this.diagram.compute(seeds, {xl:0, xr:w, yt:0, yb:h})
        this.draw_with_animation()
        
        // Continue animation
        this.auto_animation_id = requestAnimationFrame(() => this.animate_seeds())
    }

    draw_with_animation(){
        // Custom draw that includes size variation based on velocity
        this.clear_svg(this.svg.main)
        
        if(this.view_svg.shape){
            this.shape.draw(this.svg.main)
        }
        
        if(this.view_svg.cells){
            const params = {
                svg: this.svg.main,
                shape: this.cells_shape,
                color: this.is_color,
                min_edge: this.min_edge,
                retraction: this.cells_space,
                debug: this.cell_debug,
                animate: true,
                velocities: this.seed_velocities,
                size_variance: this.animation_size_variance
            }
            this.diagram.draw_cells_animated(params)
        }
        
        if(this.view_svg.edges){
            this.diagram.draw_edges({svg: this.svg.main})
        }
        
        if(this.view_svg.seeds){
            this.seeds.draw({svg: this.svg.main})
        }
    }

    start_auto_animation(){
        if(this.auto_animate) return
        
        this.auto_animate = true
        this.init_seed_animation()
        this.animate_seeds()
    }

    stop_auto_animation(){
        this.auto_animate = false
        if(this.auto_animation_id){
            cancelAnimationFrame(this.auto_animation_id)
            this.auto_animation_id = null
        }
        // Redraw to show final state
        this.draw()
    }

    toggle_auto_animation(){
        if(this.auto_animate){
            this.stop_auto_animation()
        }else{
            this.start_auto_animation()
        }
        return this.auto_animate
    }

    update(params){
        params.context = this
        this.diagram.update(params)
        this.seeds.update(params)
        this.shape.update(params)
        if(defined(params.shape_seeds)){
            this.seeds.update({clear:true})
            this.compute_voronoi()
        }
        if(defined(params.shape_cells)){
            this.draw()
        }
        if(defined(params.map)){
            // && (this.shape.map_used)
            //TODO shall be events based
            if(params.map == "clear"){
                this.seeds.update({clear:true})
                this.compute_voronoi()
            }else{
                fetch(`./data/${params.map}.png`)
                .then(response => response.arrayBuffer())
                .then((image_buffer) => {
                    this.shape.load_cost_map(image_buffer,()=>{
                        this.seeds.update({clear:true})
                        this.compute_voronoi()
                    })
                })
            }
        }
    }

    update_seeds(params){
        this.seeds.update(params)
        this.compute_voronoi()
    }

    update_size(clear){
        this.max_width = this.svg.main.clientWidth
        this.max_height = this.svg.main.clientHeight
        if((this.width == 0) || (this.width > this.max_width)){
            this.width = this.max_width
        }
        if((this.height == 0) || (this.height > this.max_height)){
            this.height = this.max_height
        }
        console.log(`set svg ( ${this.width} , ${this.height} )`)
        this.update_seeds({clear:clear,width:this.width,height:this.height})
    }
    resize(width,height,params={}){
        this.svg.main.setAttributeNS(null,"width",width)
        this.svg.main.setAttributeNS(null,"height",height)
        this.width = width
        this.height = height
        console.log(`set svg ( ${this.width} , ${this.height} )`)
        const clear = defined(params.clear)?params.clear:true
        this.update_seeds({clear:clear,width:this.width,height:this.height})
    }


    save_svg(fileName){
        let svg_out = this.svg.main.cloneNode()//lazy, just for new svg creation
        this.draw_svg(svg_out,this.export_svg)
        let svg = new Svg()
        svg.save(fileName,svg_out)
    }

    save_seeds(fileName){
        this.seeds.save(fileName)
    }

    load_dropped_svg(reader){
        console.log("svg dropped")
        const vor_context = this
        reader.onloadend = function(e){vor_context.shape.load_path(this.result,vor_context)};
    }
    load_dropped_png(reader){
        console.log("png dropped")
        const vor_context = this
        reader.onloadend = function(e) {
            vor_context.shape.load_cost_map(this.result,
                ()=>{
                    vor_context.seeds.update({clear:true})
                    vor_context.compute_voronoi()
                });
        };
    }
    load_dropped_seeds(reader){
        console.log("extention check - OK")
        const vor_context = this
        reader.onloadend = function(e) {
            var result = JSON.parse(this.result);
            const is_loaded = vor_context.seeds.load(result,{context:vor_context})
            if(!is_loaded){
                alert(`unsupported seeds format`);
            }
        };
    }
    load_dropped_file(file){
        var reader = new FileReader();
        let extension = file.name.split('.').pop();
        if(extension == "json"){
            this.load_dropped_seeds(reader)
            reader.readAsText(file);
        }else if(extension == "svg"){
            this.load_dropped_svg(reader)
            reader.readAsText(file);
        }else if(extension == "png"){
            this.load_dropped_png(reader)
            reader.readAsArrayBuffer(file);
        }else{
            alert(`unsupported file format`);
        }
    }
    vor_app_event(e){
        const that = e.detail.context
        if(e.detail.type == "draw"){
            that.draw()
        }else if(e.detail.type == "compute"){
            that.compute_voronoi()
            //includes draw()
        }else if(e.detail.type == "seeds"){
            that.seeds.update({clear:true})
            that.compute_voronoi()
            //includes draw()
        }
    }

    init_events(){
        $(this.svg.main).click((e)=>{
            if(this.mouse_action == "add"){
                this.seeds.add({x:e.offsetX, y:e.offsetY})
                this.compute_voronoi()
            }else if(this.mouse_action == "remove"){
                this.seeds.remove({x:e.offsetX, y:e.offsetY})
                this.compute_voronoi()
            }
        })
        $(this.svg.main).mousemove((e)=>{
            if(this.mouse_action == "move"){
                if(e.buttons == 1){
                    this.seeds.move({x:e.offsetX, y:e.offsetY})
                    this.compute_voronoi_smooth()
                }
            }
        })
        $(this.svg.main).on("touchmove",(e)=>{
            console.log(e.target.tagName)
            if(this.mouse_action == "move"){
                this.seeds.move({x:e.touches[0].offsetX, y:e.touches[0].offsetY})
                this.compute_voronoi_smooth()
            }
        })
        $(this.svg.main).mousedown((e)=>{
            console.log("mouse down")
            if(this.mouse_action == "move"){
                this.seeds.move({x:e.offsetX, y:e.offsetY})
                this.compute_voronoi_smooth()
            }
        })
        $(this.svg.main).on("touchstart",(e)=>{
            console.log()
            const [x,y] = [e.touches[0].offsetX,e.touches[0].offsetY]
            if(this.mouse_action == "add"){
                this.seeds.add({x:x, y:y})
                this.compute_voronoi()
            }else if(this.mouse_action == "move"){
                this.seeds.move({x:x, y:y})
                this.compute_voronoi_smooth()
            }else if(this.mouse_action == "remove"){
                this.seeds.remove({x:x, y:y})
                this.compute_voronoi()
            }
            e.preventDefault()
        })

        window.addEventListener("vor_app",this.vor_app_event,false)

        let that = this
        let onDragEvents = function(event){
            if(!event.dataTransfer){
                alert("Browser support issue, 'event.dataTransfer' does not exist")
            }
            event.stopPropagation();
            event.preventDefault();
            if(event.type == "dragenter"){
                event.dataTransfer.dropEffect = "copy";
            }
            if(event.type == "drop"){
                if(event.dataTransfer.files.length != 1){
                    alert("only one file allowed");
                    console.log(event.dataTransfer.files);
                    return;
                }else{
                    that.load_dropped_file(event.dataTransfer.files[0]);
                }
            };
        }
    
        document.addEventListener('dragenter', onDragEvents, false)
        document.addEventListener('dragover',  onDragEvents, false)
        document.addEventListener('dragleave', onDragEvents, false)
        document.addEventListener('drop',      onDragEvents, false)
    }


}



export {voronoi_app};
