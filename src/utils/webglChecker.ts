export const checkWebGLSupport = (): boolean => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return gl !== null && gl !== undefined;
    } catch (error) {
        console.warn('[WebGLChecker] WebGL support check failed:', error);
        return false;
    }
};
