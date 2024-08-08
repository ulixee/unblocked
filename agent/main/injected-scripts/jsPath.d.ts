interface ITypeSerializer {
    stringify(object: any): string;
    parse(object: string): any;
    replace(object: any): any;
}
declare global {
    let TypeSerializer: ITypeSerializer;
    let ObjectAtPath: any;
    interface Window {
        extractDomChanges?(): any;
        replayInteractions(resultNodeIds?: {
            frameIdPath: string;
            nodeIds: number[];
        }): any;
        trackElement?(node: Node): any;
    }
}
export {};
