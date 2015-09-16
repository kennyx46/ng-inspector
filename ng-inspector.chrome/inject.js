if (window.top === window) {

	// Inject the bridge script

	// window.name = "NG_DEFER_BOOTSTRAP!";

	var inspectorScript = document.createElement('script');
	inspectorScript.type = 'text/javascript';
	inspectorScript.src = chrome.extension.getURL('/ng-inspector.js');
	// inspectorScript.textContent = chrome.extension.getURL('/ng-inspector.js');

	var scripts = new Map();

	new MutationObserver(function (mutations) {
		mutations.map(function (mutation) {
			var addedNode = mutation.addedNodes[0];
			if (addedNode && addedNode.tagName === 'SCRIPT') {
				if (addedNode.textContent) {
					scripts.set(addedNode, addedNode.textContent);
					addedNode.textContent = "";
				}
			}
		});
	}).observe(document, { childList: true, subtree: true });

	window.addEventListener('load', function () {
		document.head.appendChild(inspectorScript);
		inspectorScript.onload = function () {
			scripts.forEach(function (content, script) {
				script.textContent = content;
			});
		};
	});

	// In Chrome, we use this thing
	if ('chrome' in window) {
		chrome.runtime.onMessage.addListener(function(message, sender) {
			if (message.command && message.command === 'ngi-toggle') {
				window.postMessage(JSON.stringify(message), window.location.origin);
			}
		});
	}

}