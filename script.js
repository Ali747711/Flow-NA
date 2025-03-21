document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const flowchartArea = document.getElementById('flowchartArea');
    const addNodeBtn = document.getElementById('addNodeBtn');
    const savePngBtn = document.getElementById('savePngBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const resetBtn = document.getElementById('resetBtn');
    const labelModal = document.getElementById('labelModal');
    const nodeLabelInput = document.getElementById('nodeLabel');
    const saveLabelBtn = document.getElementById('saveLabelBtn');
    const cancelLabelBtn = document.getElementById('cancelLabelBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingText = document.getElementById('loadingText');

    // State
    let nodes = [];
    let connections = [];
    let nodeCounter = 0;
    let selectedNode = null;
    let isDragging = false;
    let isConnecting = false;
    let connectingNode = null;
    let currentConnection = null;
    let activeNodeId = null;
    let offset = { x: 0, y: 0 };
    
    // History for undo/redo
    let history = [];
    let historyIndex = -1;
    let ignoreNextSave = false;

    // Save current state to history
    function saveToHistory() {
        if (ignoreNextSave) {
            ignoreNextSave = false;
            return;
        }
        
        // If we're not at the end of the history array, truncate it
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        // Create a deep copy of the current state
        const state = {
            nodes: JSON.parse(JSON.stringify(nodes.map(n => ({
                id: n.id,
                x: n.x,
                y: n.y,
                label: n.label
            })))),
            connections: JSON.parse(JSON.stringify(connections.map(c => ({
                startId: c.startId,
                endId: c.endId
            }))))
        };
        
        // Add to history
        history.push(state);
        historyIndex = history.length - 1;
        
        // Update button states
        updateHistoryButtons();
    }

    // Update undo/redo button states
    function updateHistoryButtons() {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }

    // Undo function
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(history[historyIndex]);
            updateHistoryButtons();
        }
    }

    // Redo function
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            restoreState(history[historyIndex]);
            updateHistoryButtons();
        }
    }

    // Reset function
    function reset() {
        // Clear all nodes and connections
        clearFlowchart();
        
        // Add to history
        saveToHistory();
    }

    // Clear the flowchart
    function clearFlowchart() {
        // Remove all node elements
        nodes.forEach(node => {
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) nodeElement.remove();
        });
        
        // Remove all connection elements
        connections.forEach(conn => {
            if (conn.line) conn.line.remove();
            if (conn.arrow) conn.arrow.remove();
        });
        
        // Reset state
        nodes = [];
        connections = [];
        selectedNode = null;
        nodeCounter = 0;
    }

    // Restore state from history
    function restoreState(state) {
        ignoreNextSave = true;
        
        // Clear current flowchart
        clearFlowchart();
        
        // Restore nodes
        state.nodes.forEach(nodeData => {
            const nodeId = nodeData.id;
            const node = createNode(nodeId);
            node.style.left = `${nodeData.x}px`;
            node.style.top = `${nodeData.y}px`;
            
            const labelElement = node.querySelector('.node-label');
            labelElement.textContent = nodeData.label || '';
            
            nodes.push({
                id: nodeId,
                element: node,
                x: nodeData.x,
                y: nodeData.y,
                label: nodeData.label || ''
            });
            
            flowchartArea.appendChild(node);
            
            // Update node counter if needed
            const nodeNumber = parseInt(nodeId.split('-')[1]);
            if (nodeNumber >= nodeCounter) {
                nodeCounter = nodeNumber + 1;
            }
        });
        
        // Restore connections
        state.connections.forEach(connData => {
            const startNode = nodes.find(n => n.id === connData.startId);
            const endNode = nodes.find(n => n.id === connData.endId);
            
            if (startNode && endNode) {
                // Create connection elements
                const line = document.createElement('div');
                line.className = 'connector-line';
                
                const arrow = document.createElement('div');
                arrow.className = 'connector-arrow';
                
                flowchartArea.appendChild(line);
                flowchartArea.appendChild(arrow);
                
                // Add to connections array
                const connection = {
                    startId: connData.startId,
                    endId: connData.endId,
                    line: line,
                    arrow: arrow
                };
                
                connections.push(connection);
                
                // Position the connection
                updateConnectionPosition(connection);
            }
        });
    }

    // Add a new node to the flowchart
    addNodeBtn.addEventListener('click', () => {
        const nodeId = `node-${nodeCounter++}`;
        const node = createNode(nodeId);
        
        // Position node in the center of the visible area
        const flowchartRect = flowchartArea.getBoundingClientRect();
        const centerX = Math.max(0, (flowchartRect.width / 2) - 75);
        const centerY = Math.max(0, (flowchartRect.height / 2) - 40);
        
        node.style.left = `${centerX}px`;
        node.style.top = `${centerY}px`;
        
        nodes.push({
            id: nodeId,
            element: node,
            x: centerX,
            y: centerY,
            label: ''
        });
        
        flowchartArea.appendChild(node);
        openLabelModal(nodeId);
        
        // Save state to history
        saveToHistory();
    });

    // Create a node element
    function createNode(id) {
        const node = document.createElement('div');
        node.id = id;
        node.className = 'node';
        
        // Node label
        const label = document.createElement('div');
        label.className = 'node-label';
        label.textContent = '';
        node.appendChild(label);
        
        // Delete button
        const actions = document.createElement('div');
        actions.className = 'node-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'node-btn delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = "Delete node";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNode(id);
        });
        
        actions.appendChild(deleteBtn);
        node.appendChild(actions);
        
        // Connector button
        const connectorBtn = document.createElement('div');
        connectorBtn.className = 'connector-button connector-right';
        connectorBtn.innerHTML = '→';
        connectorBtn.title = "Connect to another node";
        connectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startConnecting(id);
        });
        
        node.appendChild(connectorBtn);
        
        // Event listeners for node
        node.addEventListener('mousedown', (e) => {
            if (e.target === node || e.target === label) {
                // Start dragging
                selectNode(id);
                isDragging = true;
                const rect = node.getBoundingClientRect();
                offset.x = e.clientX - rect.left;
                offset.y = e.clientY - rect.top;
            }
        });
        
        node.addEventListener('dblclick', (e) => {
            if (e.target === node || e.target === label) {
                openLabelModal(id);
            }
        });
        
        // Handle connecting mode clicks
        node.addEventListener('click', (e) => {
            if (isConnecting && connectingNode && connectingNode !== id) {
                completeConnection(id);
            }
        });
        
        return node;
    }

    // Start connecting nodes
    function startConnecting(nodeId) {
        // If already connecting, cancel it
        if (isConnecting) {
            cancelConnecting();
        }
        
        // Start new connection
        isConnecting = true;
        connectingNode = nodeId;
        
        // Change cursor to indicate connecting mode
        document.body.style.cursor = 'crosshair';
        
        // Highlight source node
        const sourceNode = document.getElementById(nodeId);
        if (sourceNode) {
            sourceNode.classList.add('selected');
        }
    }

    // Cancel connecting mode
    function cancelConnecting() {
        isConnecting = false;
        
        // Remove source node highlight
        if (connectingNode) {
            const sourceNode = document.getElementById(connectingNode);
            if (sourceNode) {
                sourceNode.classList.remove('selected');
            }
        }
        
        connectingNode = null;
        document.body.style.cursor = 'default';
    }

    // Complete connection between nodes
    function completeConnection(targetNodeId) {
        if (!connectingNode) return;
        
        // Check if connection already exists
        const connectionExists = connections.some(
            conn => conn.startId === connectingNode && conn.endId === targetNodeId
        );
        
        if (!connectionExists) {
            // Create connection elements
            const line = document.createElement('div');
            line.className = 'connector-line';
            
            const arrow = document.createElement('div');
            arrow.className = 'connector-arrow';
            
            flowchartArea.appendChild(line);
            flowchartArea.appendChild(arrow);
            
            // Add to connections array
            const connection = {
                startId: connectingNode,
                endId: targetNodeId,
                line: line,
                arrow: arrow
            };
            
            connections.push(connection);
            
            // Position the connection
            updateConnectionPosition(connection);
            
            // Save state to history
            saveToHistory();
        }
        
        // Exit connecting mode
        cancelConnecting();
    }

    // Select a node
    function selectNode(id) {
        // Deselect current selection
        if (selectedNode) {
            const oldNode = document.getElementById(selectedNode);
            if (oldNode) oldNode.classList.remove('selected');
        }
        
        // Select new node
        selectedNode = id;
        const newNode = document.getElementById(id);
        if (newNode) newNode.classList.add('selected');
    }

    // Delete a node
    function deleteNode(id) {
        // Remove the node element
        const node = document.getElementById(id);
        if (node) node.remove();
        
        // Remove connections involving this node
        const connectionsToRemove = connections.filter(
            conn => conn.startId === id || conn.endId === id
        );
        
        connectionsToRemove.forEach(conn => {
            if (conn.line) conn.line.remove();
            if (conn.arrow) conn.arrow.remove();
        });
        
        connections = connections.filter(
            conn => conn.startId !== id && conn.endId !== id
        );
        
        // Update nodes array
        nodes = nodes.filter(node => node.id !== id);
        
        // Clear selection
        if (selectedNode === id) {
            selectedNode = null;
        }
        
        // Save state to history
        saveToHistory();
    }

    // Open modal to edit node label
    function openLabelModal(nodeId) {
        activeNodeId = nodeId;
        
        // Get current label
        const nodeObj = nodes.find(n => n.id === nodeId);
        if (nodeObj) {
            nodeLabelInput.value = nodeObj.label || '';
        } else {
            nodeLabelInput.value = '';
        }
        
        // Show modal
        labelModal.style.display = 'flex';
        nodeLabelInput.focus();
    }

    // Save label from modal
    function saveLabel() {
        if (!activeNodeId) return;
        
        const label = nodeLabelInput.value.trim();
        
        // Update node object
        const nodeObj = nodes.find(n => n.id === activeNodeId);
        if (nodeObj) {
            nodeObj.label = label;
            
            // Update node element
            const node = document.getElementById(activeNodeId);
            if (node) {
                const labelElement = node.querySelector('.node-label');
                if (labelElement) {
                    labelElement.textContent = label;
                }
            }
            
            // Save state to history
            saveToHistory();
        }
        
        // Close modal
        closeModal();
    }

    // Close the modal
    function closeModal() {
        labelModal.style.display = 'none';
        activeNodeId = null;
    }

    // Update connection position based on node positions
    function updateConnectionPosition(connection) {
        const startNode = document.getElementById(connection.startId);
        const endNode = document.getElementById(connection.endId);
        
        if (!startNode || !endNode || !connection.line || !connection.arrow) return;
        
        // Get node positions and sizes
        const startRect = startNode.getBoundingClientRect();
        const endRect = endNode.getBoundingClientRect();
        const flowchartRect = flowchartArea.getBoundingClientRect();
        
        // Calculate offset due to flowchart area's scroll position
        const scrollLeft = flowchartArea.scrollLeft;
        const scrollTop = flowchartArea.scrollTop;
        
        // Calculate center points
        const startX = startRect.left - flowchartRect.left + startRect.width / 2 + scrollLeft;
        const startY = startRect.top - flowchartRect.top + startRect.height / 2 + scrollTop;
        const endX = endRect.left - flowchartRect.left + endRect.width / 2 + scrollLeft;
        const endY = endRect.top - flowchartRect.top + endRect.height / 2 + scrollTop;
        
        // Calculate the midpoint between the nodes
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // Calculate edge points of nodes (right side of start, left side of end)
        const startRightX = startX + startRect.width / 2;
        const startRightY = startY;
        
        const endLeftX = endX - endRect.width / 2;
        const endLeftY = endY;
        
        // Calculate the length of the line
        const dx = endLeftX - startRightX;
        const dy = endLeftY - startRightY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate the angle of the line
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Position and rotate the line
        connection.line.style.width = `${length}px`;
        connection.line.style.left = `${startRightX}px`;
        connection.line.style.top = `${startRightY}px`;
        connection.line.style.transform = `rotate(${angle}deg)`;
        
        // Position and rotate the arrow
        connection.arrow.style.left = `${endLeftX - 10}px`;
        connection.arrow.style.top = `${endLeftY}px`;
        connection.arrow.style.transform = `rotate(${angle}deg) translate(-50%, -50%)`;
    }

    // Update all connection positions (called after node movement)
    function updateAllConnections() {
        connections.forEach(updateConnectionPosition);
    }

    // Handler for mouse movement during drag
    function handleMouseMove(e) {
        if (!isDragging || !selectedNode) return;
        
        const nodeElement = document.getElementById(selectedNode);
        if (!nodeElement) return;
        
        // Get flowchart area bounds
        const flowchartRect = flowchartArea.getBoundingClientRect();
        
        // Calculate new position, accounting for scroll
        const newX = e.clientX - flowchartRect.left - offset.x + flowchartArea.scrollLeft;
        const newY = e.clientY - flowchartRect.top - offset.y + flowchartArea.scrollTop;
        
        // Ensure node stays within flowchart area bounds
        const adjustedX = Math.max(0, Math.min(newX, flowchartArea.scrollWidth - nodeElement.offsetWidth));
        const adjustedY = Math.max(0, Math.min(newY, flowchartArea.scrollHeight - nodeElement.offsetHeight));
        
        // Update node element position
        nodeElement.style.left = `${adjustedX}px`;
        nodeElement.style.top = `${adjustedY}px`;
        
        // Update node data
        const nodeObj = nodes.find(n => n.id === selectedNode);
        if (nodeObj) {
            nodeObj.x = adjustedX;
            nodeObj.y = adjustedY;
        }
        
        // Update connections
        updateAllConnections();
    }

    // Handler for mouse up after drag
    function handleMouseUp() {
        if (isDragging && selectedNode) {
            // Save the new state to history
            saveToHistory();
        }
        
        isDragging = false;
    }

    // Handler for flowchart area click (to cancel connecting mode)
    function handleFlowchartClick(e) {
        if (isConnecting && e.target === flowchartArea) {
            cancelConnecting();
        }
    }

    // Save flowchart as PNG
    async function savePNG() {
        try {
            // Show loading indicator
            showLoading('Generating PNG...');
            
            // Use html2canvas to render the flowchart
            const canvas = await html2canvas(flowchartArea, {
                backgroundColor: '#ffffff',
                // Increase scale for better quality
                scale: 2
            });
            
            // Convert canvas to PNG data URL
            const dataUrl = canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'logistics-flowchart.png';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Hide loading indicator
            hideLoading();
        } catch (error) {
            console.error('Error saving PNG:', error);
            hideLoading();
            alert('Failed to save PNG. Please try again.');
        }
    }

    // Save flowchart as PDF
    async function savePDF() {
        try {
            // Show loading indicator
            showLoading('Generating PDF...');
            
            // Use html2canvas to render the flowchart
            const canvas = await html2canvas(flowchartArea, {
                backgroundColor: '#ffffff',
                // Increase scale for better quality
                scale: 2
            });
            
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm'
            });
            
            // Calculate PDF dimensions while maintaining aspect ratio
            const imgWidth = pdf.internal.pageSize.getWidth() - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Add the canvas as an image to the PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            
            // Save the PDF
            pdf.save('logistics-flowchart.pdf');
            
            // Hide loading indicator
            hideLoading();
        } catch (error) {
            console.error('Error saving PDF:', error);
            hideLoading();
            alert('Failed to save PDF. Please try again.');
        }
    }

    // Show loading indicator
    function showLoading(text) {
        loadingText.textContent = text || 'Processing...';
        loadingIndicator.style.display = 'block';
    }

    // Hide loading indicator
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Register event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    flowchartArea.addEventListener('click', handleFlowchartClick);
    saveLabelBtn.addEventListener('click', saveLabel);
    cancelLabelBtn.addEventListener('click', closeModal);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    resetBtn.addEventListener('click', reset);
    savePngBtn.addEventListener('click', savePNG);
    savePdfBtn.addEventListener('click', savePDF);

    // Handle Enter key in the label input field
    nodeLabelInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveLabel();
        }
    });

    // Initialize history
    saveToHistory();

    // Initialize buttons
    updateHistoryButtons();
});
