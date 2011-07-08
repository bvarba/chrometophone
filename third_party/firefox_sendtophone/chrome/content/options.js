"use strict";

let foxToPhonePreferences =
{
	load: function()
	{
		let fileServerUrl = document.getElementById("extensions.sendtophone.fileServerUrl").value;

		let fileserverMenuList = document.getElementById("extensionsSendToPhoneFileServer") ;

		switch (fileServerUrl)
		{
			case '':
				fileserverMenuList.value = fileServerUrl;
				break;

			case 'http://min.us':
				fileserverMenuList.value = fileServerUrl;
				break;

			default:
				fileserverMenuList.value = 'Custom';
				break;
		}

		fileserverMenuList.addEventListener("command", function () {
				let fileServer = fileserverMenuList.value;
				switch (fileServer)
				{
					case '':
						document.getElementById("extensions.sendtophone.fileServerUrl").value = '';
						break;

					case 'Custom':
						break;

					default:
						document.getElementById("extensions.sendtophone.fileServerUrl").value = fileServer;
						break;
				}

				document.getElementById("hboxFileServerUrl").hidden = ( fileServer != 'Custom');

				window.sizeToContent();
			}, false);

		document.getElementById("hboxFileServerUrl").hidden = ( fileserverMenuList.value != 'Custom');

		window.sizeToContent();

	}
} ;


this.addEventListener("load", function () {foxToPhonePreferences.load(); }, false);
