const flowchart = document.getElementById('flowchart');
const nodeOptions = document.querySelectorAll('.node-option');
const savePngButton = document.getElementById('save-png');
const savePdfButton = document.getElementById('save-pdf');

let nodes = [];
let arrows = [];
let draggingNode = null;
let offsetX, offsetY;

nodeOptions.forEach(option => {
    option.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', option.dataset.nodeType);
    });
    option.draggable = true;
});

flowchart.addEventListener('dragover', (e) => {
    e.preventDefault();
});

flowchart.addEventListener('drop', (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('text/plain');
    const newNode = createNode(nodeType, e.offsetX, e.offsetY);
    flowchart.appendChild(newNode);
    nodes.push(newNode);
});

function createNode(type, x, y) {
    const node = document.createElement('div');
    node.classList.add('node');
    node.dataset.type = type;
    node.style.left = x + 'px';
    node.style.top = y + 'px';

    let iconClass = '';
    let label = '';

    switch (type) {
        case 'supplier': iconClass = 'fas fa-truck'; label = 'Supplier'; break;
        case 'warehouse': iconClass = 'fas fa-warehouse'; label = 'Warehouse'; break;
        case 'distribution': iconClass = 'fas fa-shipping-fast'; label = 'Distribution'; break;
        case 'retail': iconClass = 'fas fa-store'; label = 'Retail'; break;
        case 'transport': iconClass = 'fas fa-route'; label = 'Transport'; break;
    }

    node.innerHTML = `<i class="${iconClass}"></i> ${label}`;

    node.addEventListener('mousedown', (e) => {
        draggingNode = node;
        offsetX = e.clientX - node.offsetLeft;
        offsetY = e.clientY - node.offsetTop;
    });

    return node;
}

document.addEventListener('mousemove', (e) => {
    if (draggingNode) {
        draggingNode.style.left = e.clientX - offsetX + 'px';
        draggingNode.style.top = e.clientY - offsetY + 'px';
        updateArrows();
    }
});

document.addEventListener('mouseup', () => {
    draggingNode = null;
});

function updateArrows() {
    // Basic arrow update (to be expanded)
    arrows.forEach(arrow => {
        //update arrow position based on the connected nodes.
    });
}

// Placeholder for save functions
savePngButton.addEventListener('click', () => {
    alert("Save as PNG functionality to be implemented.");
});

savePdfButton.addEventListener('click', () => {
    alert("Save as PDF functionality to be implemented.");
});
