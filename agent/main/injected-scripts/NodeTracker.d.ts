interface IStaticNodeTracker {
    has(node: Node): boolean;
    getNodeId(node: Node): number | undefined;
    getWatchedNodeWithId(id: number): Node;
    watchNode(node: Node): number | undefined;
    track(node: Node): number;
}
declare global {
    interface Window {
        NodeTracker: IStaticNodeTracker;
    }
    let NodeTracker: IStaticNodeTracker;
}
export {};
