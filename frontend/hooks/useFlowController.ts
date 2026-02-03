import { useState, useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  useOnSelectionChange,
} from 'reactflow';
import { scanTopic, generatePost, generateImage, planWorkflow } from '../services/gemini';
import { FlowContext, ModuleType } from '../types';
import { NotificationType } from '../components/NotificationToast';

// -- Initial Configuration --
const Y_POS = 150;
const X_GAP = 400;

const initialNodes: Node[] = [
  { 
    id: 'input', type: 'INPUT', position: { x: 0, y: Y_POS }, 
    data: { id: 'input', moduleType: 'INPUT', status: 'IDLE', config: { inputValue: '', enabled: true } } 
  },
  { 
    id: 'search', type: 'SEARCH', position: { x: X_GAP * 1, y: Y_POS }, 
    hidden: true,
    data: { id: 'search', moduleType: 'SEARCH', status: 'IDLE', config: { enabled: false } } 
  },
  { 
    id: 'write', type: 'WRITE', position: { x: X_GAP * 2, y: Y_POS }, 
    hidden: true,
    data: { id: 'write', moduleType: 'WRITE', status: 'IDLE', config: { tone: 'Conversational / Casual', language: 'Vietnamese', enabled: false } } 
  },
  { 
    id: 'image', type: 'IMAGE', position: { x: X_GAP * 3, y: Y_POS }, 
    hidden: true,
    data: { id: 'image', moduleType: 'IMAGE', status: 'IDLE', config: { imageCount: 3, enabled: false } } 
  },
  { 
    id: 'preview', type: 'PREVIEW', position: { x: X_GAP * 4, y: Y_POS }, 
    hidden: true,
    data: { id: 'preview', moduleType: 'PREVIEW', status: 'IDLE', config: { previewMode: 'Twitter', enabled: false } } 
  },
  { 
    id: 'publisher', type: 'PUBLISHER', position: { x: X_GAP * 5, y: Y_POS }, 
    hidden: true,
    data: { id: 'publisher', moduleType: 'PUBLISHER', status: 'IDLE', config: { enabled: false } } 
  },
  { 
    id: 'output', type: 'OUTPUT', position: { x: X_GAP * 1, y: Y_POS }, 
    data: { id: 'output', moduleType: 'OUTPUT', status: 'IDLE', config: { enabled: true } } 
  },
];

const initialEdges: Edge[] = [
  { id: 'e-input-output', source: 'input', target: 'output', animated: true, type: 'default', style: { stroke: '#a1a1aa' } },
];

interface UseFlowControllerProps {
  onNotify: (type: NotificationType, message: string) => void;
}

export const useFlowController = ({ onNotify }: UseFlowControllerProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  // Get current input value from the Input node
  const inputNode = nodes.find(n => n.id === 'input');
  const inputValue = inputNode?.data.config.inputValue || '';
  const inputImage = inputNode?.data.config.selectedImage || null;

  const setInputValue = useCallback((value: string) => {
    setNodes((nds) => nds.map(n => {
      if (n.id === 'input') {
        return { 
          ...n, 
          data: { ...n.data, config: { ...n.data.config, inputValue: value } } 
        };
      }
      return n;
    }));
  }, [setNodes]);

  const setInputImage = useCallback((image: string | null) => {
    setNodes((nds) => nds.map(n => {
      if (n.id === 'input') {
        return { 
          ...n, 
          data: { ...n.data, config: { ...n.data.config, selectedImage: image || undefined } } 
        };
      }
      return n;
    }));
  }, [setNodes]);

  // -- Layout Engine --

  const performLayout = (currentNodes: Node[], animate = true) => {
    const nodesWithVisibility = currentNodes.map(n => ({
        ...n,
        hidden: n.data.config.enabled === false,
    }));

    const activeNodes = nodesWithVisibility.filter(n => !n.hidden);
    
    let xCounter = 0;
    const positionedNodes = nodesWithVisibility.map(n => {
        if (n.hidden) return n;
        const newPos = { x: xCounter * X_GAP, y: Y_POS };
        xCounter++;
        return { ...n, position: newPos };
    });

    const newEdges: Edge[] = [];
    for (let i = 0; i < activeNodes.length - 1; i++) {
        const source = activeNodes[i];
        const target = activeNodes[i + 1];
        newEdges.push({
            id: `e-${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            animated: true,
            type: 'default',
            style: { stroke: '#a1a1aa' }
        });
    }

    setNodes(positionedNodes);
    setEdges(newEdges);

    if (animate) {
        setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 50);
    }
  };

  // -- Orchestration Logic --
  
  const handleOrchestratePlan = useCallback(async () => {
    if (!inputValue && !inputImage) return; // Allow planning if image exists even if text is empty
    setIsPlanning(true);
    try {
        // Plan now returns { modules: [], config: { writer: {}, image: {} } }
        // We append "image attached" to context if image exists to help planner
        const planningIntent = inputImage 
            ? `${inputValue} (User has attached a reference image)` 
            : inputValue;

        const plan = await planWorkflow(planningIntent);
        
        const plannedModules: string[] = plan.modules || [];
        const config = plan.config || {};
        
        // Always ensure mandatory modules
        const required = ['INPUT', 'OUTPUT'];
        
        // Create new node state
        const updatedNodes = nodes.map((n) => {
            let newNode = { ...n };
            let newConfig = { ...n.data.config };

            // 1. Enable/Disable Logic
            if (required.includes(n.type || '')) {
                newConfig.enabled = true;
            } else {
                newConfig.enabled = plannedModules.includes(n.data.moduleType);
            }

            // 2. Apply Deep Configuration
            if (n.type === 'WRITE' && config.writer) {
                if (config.writer.tone) newConfig.tone = config.writer.tone;
                // Force Twitter
                newConfig.platform = "Twitter"; 
                if (config.writer.length) newConfig.length = config.writer.length;
                if (config.writer.language) newConfig.language = config.writer.language;
            }

            if (n.type === 'IMAGE' && config.image) {
                if (config.image.style) newConfig.imageStyle = config.image.style;
                if (config.image.count) newConfig.imageCount = config.image.count;
            }

            // 3. Update preview mode based on writer platform
            if (n.type === 'PREVIEW') {
                newConfig.previewMode = "Twitter";
            }

            newNode.data = { ...newNode.data, config: newConfig };
            return newNode;
        });

        // Apply new layout with animation
        performLayout(updatedNodes, true);
        
        onNotify('info', `Workflow configured for "${inputValue.substring(0, 20)}..."`);

    } catch (e: any) {
        console.error("Auto-plan failed", e);
        onNotify('error', "Failed to plan workflow. Please try again.");
    } finally {
        setIsPlanning(false);
    }
  }, [nodes, inputValue, inputImage, onNotify]);

  // -- Node & Edge Helpers --

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#a1a1aa' }, type: 'default', }, eds)),
    [setEdges]
  );

  const onUpdateNodeConfig = useCallback((id: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, config: { ...node.data.config, ...updates } },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, [setNodes, setEdges]);

  // Inject handlers into nodes
  const nodesWithHandlers = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onUpdateConfig: onUpdateNodeConfig,
      onDelete: onDeleteNode,
    }
  }));

  // Track selection
  useOnSelectionChange({
    onChange: ({ nodes }) => {
      setSelectedNodeId(nodes.length > 0 ? nodes[0].id : null);
    },
  });

  const handleSelectModule = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node?.hidden) return;

    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === id })));
    setSelectedNodeId(id);
    
    // Slight zoom to focus, but keep spacing for drawer
    setTimeout(() => {
        fitView({ nodes: [{ id }], duration: 600, padding: 0.5 });
    }, 10);
  };

  const clearSelection = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setSelectedNodeId(null);
  }, [setNodes]);

  const updateNodeStatus = (id: string, status: string, output?: any, error?: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, status, output, error } };
      }
      return n;
    }));
  };

  const handleAutoLayout = () => performLayout(nodes, true);

  const handleToggleModule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNodes = nodes.map((n) => {
        if (n.id === id) {
            if (n.type === 'INPUT' || n.type === 'OUTPUT') return n;
            return {
                ...n,
                data: {
                    ...n.data,
                    config: { ...n.data.config, enabled: !n.data.config.enabled }
                }
            };
        }
        return n;
    });
    // Disable animation on toggle to prevent zoom out
    performLayout(updatedNodes, false);
  };

  // -- Execution Engine --

  const runFlow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: 'IDLE', output: undefined, error: undefined } })));
    await new Promise(r => setTimeout(r, 200));

    try {
      const inputNode = nodes.find(n => n.type === 'INPUT' && !n.hidden);
      if (!inputNode) throw new Error("No active Input module found.");

      let currentNode: Node | undefined = inputNode;
      let context: FlowContext = {};
      let safetyCounter = 0;
      
      while (currentNode && safetyCounter < 50) {
        safetyCounter++;
        updateNodeStatus(currentNode.id, 'RUNNING');
        fitView({ nodes: [{ id: currentNode.id }], duration: 800, padding: 0.3 });

        try {
           const type = currentNode.type as ModuleType;
           const config = currentNode.data.config;

           if (config.enabled === false) throw new Error("Reached disabled node unexpectedly");

           if (type === 'INPUT') {
             // Relax input check if we have image
             if (!config.inputValue && !config.selectedImage) throw new Error("Input empty");
             
             context.topic = config.inputValue;
             
             // Capture Twitter Access Token if present
             if (config.twitterAccessToken) {
                 context.twitterAccessToken = config.twitterAccessToken;
             }

             if (config.selectedImage) context.inputImage = config.selectedImage;
             updateNodeStatus(currentNode.id, 'COMPLETED');
           }
           else if (type === 'SEARCH') {
             if (!context.topic) throw new Error("Missing topic");
             const res = await scanTopic(context.topic);
             context.crawlResult = res;
             updateNodeStatus(currentNode.id, 'COMPLETED', res);
           }
           else if (type === 'WRITE') {
             const input = context.crawlResult?.summary || context.topic || "Generate content based on image";
             const res = await generatePost(
                 input, 
                 config.tone || 'Conversational / Casual', 
                 config.platform || 'Twitter',
                 config.language || 'Vietnamese',
                 config.length || 'Medium',
                 context.inputImage
             );
             context.generatedPost = res;
             updateNodeStatus(currentNode.id, 'COMPLETED', res);
           }
           else if (type === 'IMAGE') {
             const prompt = context.generatedPost?.imagePrompt || context.topic;
             if (!prompt) throw new Error("Missing prompt");
             const count = config.imageCount || 3;
             const res = await generateImage(prompt, context.inputImage, count, config.imageStyle);
             context.generatedImages = res;
             updateNodeStatus(currentNode.id, 'COMPLETED', res);
           }
           else if (type === 'PREVIEW' || type === 'PUBLISHER' || type === 'OUTPUT') {
              if (type === 'PUBLISHER' && !context.generatedPost) throw new Error("No post content.");
              updateNodeStatus(currentNode.id, 'COMPLETED', context);
           }

        } catch (e: any) {
           updateNodeStatus(currentNode.id, 'ERROR', undefined, e.message);
           
           // Handle Error Notification
           let errorMsg = e.message;
           if (e.message.includes('429') || e.message.toLowerCase().includes('quota')) {
             errorMsg = "API Quota Exceeded. Please check your billing or API limits.";
           }
           throw new Error(errorMsg); // Re-throw to break loop
        }

        const currentIdx = nodes.findIndex(n => n.id === currentNode?.id);
        const visibleNodes = nodes.filter(n => !n.hidden && n.data.config.enabled !== false);
        const currentVisibleIdx = visibleNodes.findIndex(n => n.id === currentNode?.id);
        
        if (currentVisibleIdx >= 0 && currentVisibleIdx < visibleNodes.length - 1) {
            const nextNode = visibleNodes[currentVisibleIdx + 1];
            await new Promise(r => setTimeout(r, 3000));
            currentNode = nextNode;
        } else {
            currentNode = undefined;
        }
      }
      
      onNotify('success', "Workflow executed successfully. Assets generated.");

    } catch (e: any) {
      console.error(e);
      onNotify('error', e.message);
    }
    setIsRunning(false);
  };

  const resetFlow = useCallback(() => {
    // Perform a Hard Reset
    
    // 1. Reset selection and running states
    setIsRunning(false);
    setIsPlanning(false);
    setSelectedNodeId(null);

    // 2. Deep copy initialNodes to ensure all configs (enabled, inputValue, settings) are reverted to default
    const cleanNodes = initialNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: 'IDLE',
        output: undefined,
        error: undefined,
        config: { ...node.data.config } // Clone the initial config
      }
    }));

    // 3. Apply state updates
    setNodes(cleanNodes);
    setEdges(initialEdges);
    
    // 4. Reset View
    setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 50);
  }, [setNodes, setEdges, fitView]);

  return {
    nodes: nodesWithHandlers,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    runFlow,
    resetFlow,
    handleAutoLayout,
    handleToggleModule,
    handleSelectModule,
    clearSelection,
    selectedNodeId,
    isRunning,
    inputValue,
    setInputValue,
    inputImage,
    setInputImage,
    handleOrchestratePlan,
    isPlanning
  };
};