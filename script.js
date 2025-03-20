const flowchart = document.getElementById('flowchart');
const nodeOptions = document.querySelectorAll('.node-option');
const savePngButton = document.getElementById('save-png');
const savePdfButton = document.getElementById('save-pdf');

let nodes = [];
let arrows = [];
let draggingNode = null;
let offsetX, offsetY;
let startNode = null;

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

document.addEventListener('mouseup', (e) => {
    draggingNode = null;
    if (startNode && e.target.classList.contains('node') && startNode !== e.target) {
        createArrow(startNode, e.target);
    }
    startNode = null;
});

flowchart.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('node')) {
        startNode = e.target;
    }
});

function createArrow(fromNode, toNode) {
    const arrow = document.createElement('div');
    arrow.classList.add('arrow');
    flowchart.appendChild(arrow);
    arrows.push({ from: fromNode, to: toNode, element: arrow });
    updateArrow(arrow, fromNode, toNode);
}

function updateArrow(arrowElement, fromNode, toNode) {
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();

    const fromX = fromRect.left + fromRect.width / 2;
    const fromY = fromRect.top + fromRect.height / 2;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;

    const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

    arrowElement.style.width = length + 'px';
    arrowElement.style.left = fromX + 'px';
    arrowElement.style.top = fromY + 'px';
    arrowElement.style.transform = `rotate(${angle}deg)`;
}

function updateArrows() {
    arrows.forEach(arrowObj => {
        updateArrow(arrowObj.element, arrowObj.from, arrowObj.to);
    });
}

// Placeholder for save functions
savePngButton.addEventListener('click', () => {
    alert("Save as PNG functionality to be implemented.");
});

savePdfButton.addEventListener('click', () => {
    alert("Save as PDF functionality to be implemented.");
});
