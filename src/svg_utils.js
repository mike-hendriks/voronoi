import {defined,html} from "./web-js-utils.js"

class Svg{
    constructor(svg_element){
        this.el = svg_element
    }
    set_parent(svg_element){
        this.el = svg_element
    }
    
    path(d,color,opacity){
        return html(this.el,
        /*html*/`<path d="${d}" stroke="red" stroke-width="0" fill="${color}" fill-opacity="${opacity}"/>`
        )
    }

    text(x,y,str){
        html(this.el,/*html*/`<text x="${x}" y="${y}">${str}</text>`)
    }

    circle(x,y,params={}){
        //if(!defined(params.parent)){parent=this.el}
        let if_id = (defined(params.id))?`id=${params.id}`:""
        return html(this.el,
        /*html*/`<circle ${if_id} cx=${x} cy=${y} r="3" stroke="black" stroke-width="3" fill="red" />`
        );
    }

    circ(x,y){
        //if(parent==null){parent=this.el}
        return html(this.el,
        /*html*/`<circle cx=${x} cy=${y} r="3" stroke="black" stroke-width="3" fill="red" />`
        );
    }
    
    circle_p_id(parent,x,y,id,radius=3,opacity=1){
        //
        const strokeWidth = Math.max(0.5, radius * 0.66)
        return html(parent,
        /*html*/`<circle id=${id} cx=${x} cy=${y} r="${radius}" stroke="black" stroke-width="${strokeWidth}" fill="#1F7BFD" opacity="${opacity}" />`
        );
    }
    
    eline(e,col){
        let d = `M ${e.v1.x} ${e.v1.y} L ${e.v2.x} ${e.v2.y} `
        return html(this.el,
        /*html*/`<path d="${d}" stroke="${col}" stroke-width="2" />`
        )
    }
    
    line(l,col){
        let d = `M ${l.p1.x} ${l.p1.y} L ${l.p2.x} ${l.p2.y} `
        return html(this.el,
        /*html*/`<path d="${d}" stroke="${col}" stroke-width="2" />`
        )
    }
    
    pline(v1,v2,col){
        let d = `M ${v1.x} ${v1.y} L ${v2.x} ${v2.y} `
        return html(this.el,
        /*html*/`<path d="${d}" stroke="${col}" stroke-width="1" />`
        )
    }

    pattern(parent,url,w,h){
        return html(parent,/*html*/`
            <defs>
                <pattern id="image" x="0" y="0" patternUnits="userSpaceOnUse" height="1" width="1" >
                    <image x="0" y="0" xlink:href=${url} ></image>
                </pattern>
            </defs>
            <rect width="${w}" height="${h}" fill="url(#image)" fill-opacity="0.1"/>
        `)
    }

    filter_turb_disp(parent,params){
        return html(parent,/*html*/`
            <filter id="${params.id}">
            <feTurbulence type="turbulence" baseFrequency="${params.turb_freq}"
                numOctaves="2" result="turbulence"/>
            <feDisplacementMap in2="turbulence" in="SourceGraphic"
                scale="${params.disp_scale}" xChannelSelector="R" yChannelSelector="A"/>
            </filter>
      `)
    }

    filter_inner_shadow(parent,params){
        const p = params
        return html(parent,/*html*/`
            <filter id="${p.id}" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="${p.offset1_x}" dy="${p.offset1_y}"/>
                <feGaussianBlur stdDeviation="${p.blur1}"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 ${p.color1_r} 0 0 0 0 ${p.color1_g} 0 0 0 0 ${p.color1_b} 0 0 0 ${p.color1_a} 0"/>
                <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="${p.offset2_x}" dy="${p.offset2_y}"/>
                <feGaussianBlur stdDeviation="${p.blur2}"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 ${p.color2_r} 0 0 0 0 ${p.color2_g} 0 0 0 0 ${p.color2_b} 0 0 0 ${p.color2_a} 0"/>
                <feBlend mode="normal" in2="effect1_innerShadow" result="effect2_innerShadow"/>
                
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="${p.offset3_x}" dy="${p.offset3_y}"/>
                <feGaussianBlur stdDeviation="${p.blur3}"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 ${p.color3_r} 0 0 0 0 ${p.color3_g} 0 0 0 0 ${p.color3_b} 0 0 0 ${p.color3_a} 0"/>
                <feBlend mode="normal" in2="effect2_innerShadow" result="effect3_innerShadow"/>
            </filter>
      `)
    }

    save(fileName,evg_element=null){
        if(evg_element == null){evg_element = this.el}
        let s = new XMLSerializer();
        const svg_str = s.serializeToString(evg_element);
        var blob = new Blob([svg_str], {type: 'image/svg+xml'});
        saveAs(blob, fileName);
    }
    
}

export{
    Svg
}
