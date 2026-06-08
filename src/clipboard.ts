export async function copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.body.createEl('textarea', { text });
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.select();

    try {
        if (!document.execCommand('copy')) {
            throw new Error('Clipboard copy was rejected');
        }
    } finally {
        textArea.remove();
    }
}
