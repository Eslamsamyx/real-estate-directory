export const PALETTES = {
    walls: {
        label: 'Wall paint', targetMaterial: 'wall',
        options: [
            { id: 'white', label: 'Bright white', diffuse: [0.93, 0.93, 0.91] },
            { id: 'warm-grey', label: 'Warm grey', diffuse: [0.72, 0.69, 0.65] },
            { id: 'sage', label: 'Sage', diffuse: [0.55, 0.62, 0.51] },
            { id: 'charcoal', label: 'Charcoal', diffuse: [0.20, 0.21, 0.22] }
        ]
    },
    floor: {
        label: 'Flooring', targetMaterial: 'floor',
        options: [
            { id: 'light-oak', label: 'Light oak', diffuse: [0.78, 0.65, 0.45], gloss: 0.55 },
            { id: 'dark-oak', label: 'Dark oak', diffuse: [0.32, 0.22, 0.16], gloss: 0.55 },
            { id: 'concrete', label: 'Polished concrete', diffuse: [0.55, 0.55, 0.55], gloss: 0.7 },
            { id: 'tile', label: 'Limestone tile', diffuse: [0.86, 0.84, 0.78], gloss: 0.4 }
        ]
    },
    counter: {
        label: 'Kitchen counter', targetMaterial: 'counter',
        options: [
            { id: 'quartz', label: 'White quartz', diffuse: [0.90, 0.90, 0.88], gloss: 0.85 },
            { id: 'marble', label: 'Carrara marble', diffuse: [0.88, 0.85, 0.82], gloss: 0.92 },
            { id: 'butcher', label: 'Butcher block', diffuse: [0.62, 0.43, 0.28], gloss: 0.5 }
        ]
    }
};
