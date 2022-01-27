// completely different approach copied from zotfile

Zotero.zoteropreview = new function() {
	
	this.currentStyle = "";
	
	 /**
     * Initiate zoteropreview
	 * called from include.js
	 * adds a select listener to the main window
     * @return {void}
     */
	this.init = async function () {
		Zotero.debug("zoteropreview: init");
		await Zotero.Schema.schemaUpdatePromise;
		
		// probably a massive hack, but it works, oh and zotfile does something like this it turns out
		// do not know how to hook into chrome/content/zotero/itemPane.js for "viewItem" code
		// so just listen for a select - tried all kinds of things before this
		if(window.ZoteroPane) {
			var doc = window.ZoteroPane.document;
			doc.addEventListener("select", function(){
				Zotero.zoteropreview.getCitationPreview();
				Zotero.zoteropreview.getCitationPreview2();
			});
		}
		
        var original_getCellText = Zotero.ItemTreeView.prototype.getCellText;
        Zotero.ItemTreeView.prototype.getCellText = function(row, col) {
            // row: number
            // col: object
            if (col.id === 'zotero-items-column-noteDetail') {
                const item = this.getRow(row).ref
				/*if (item.isNote() || item.isAttachment() || (item.isAnnotation != null ? item.isAnnotation() : null)) {
					return ''
				}*/
				return item.getNote().substring(0,80).replace(/<[^>]+>/g, '');
            }
			else if (col.id === 'zotero-items-column-tags') {
				const item = this.getRow(row).ref
				str=""
				item.getTags().forEach(function (tag) {str+=tag.tag+","})
				return str.slice(0, -1);
			}
			else return original_getCellText.apply(this, arguments);
        }
	};
	
	this.getCitationPreview2 = async function(){
		Zotero.debug('zoteropreview: getCitationPreview2');
		
		const zoteroPane = Zotero.getActiveZoteroPane();
		let att = zoteroPane.getSelectedItems()[0];
		let path=att.getFilePath();
		if (path.indexOf('mx-wc')>0) {
		Zotero.getActiveZoteroPane().document.getElementById('zoteropreview2-preview-box').src="file://"+path;
		Zotero.getActiveZoteroPane().document.getElementById('zotero-item-pane-content').selectedIndex=5
		}
	};
	
	this.addAttachment = async function(path) {
        Zotero.debug('zoteropreview: addAttachment');
		let rows = await Zotero.DB.queryAsync("SELECT collectionID, parentCollectionID, collectionName FROM collections where collectionName is 'Webpage'");
		//var path="Z:\\clippings\\mx-wc\\생각들\\2022-01-12-1641918068\\index.html";
		let data = await Zotero.File.getContentsAsync(path);
		var title = data.match(/<title[^>]*>(.+)<\/title>/)[1];
		let text=data.replace(/(\r\n|\n|\r)/gm, "").replace(/(<head.+\/head>)/g, "").replace(/<[^>]+>/g, '').replace(/\s\s+/g, ' ').trim();
		var attachment = await Zotero.Attachments.linkFromFile({
						file: path,
						title: title,
						collections: [rows[0].collectionID]
					});
		attachment.setNote(text);
		await attachment.saveTx();
    };



	/**
	* Primary function to generate the preview
	* called from a number of places, but primarily on selection change
	* @return {void}
	*/
	this.getCitationPreview = async function(){
		Zotero.debug('zoteropreview: getCitationPreview');
		
		// see https://www.zotero.org/support/dev/client_coding/javascript_api#managing_citations_and_bibliographies
		var items = Zotero.getActiveZoteroPane().getSelectedItems();
		
		if (items.length == 1 && Zotero.getActiveZoteroPane().document.getElementById('zotero-view-tabbox').selectedIndex == 4){
			var qc = Zotero.QuickCopy;
			var format = Zotero.Prefs.get("export.quickCopy.setting");
			var userpref = Zotero.Prefs.get('extensions.zoteropreview.citationstyle', true);
			// get the font size preference from the global setting
			var fontSizePref = Zotero.Prefs.get('fontSize');
			Zotero.debug("format is: " + format);
			Zotero.debug("userpref is: " + userpref);
			
			if ( userpref != "" ){
				format = "bibliography=" + userpref;
			}
			Zotero.debug("format is now: " + format);

			var msg = "No bibliography style is chosen in the settings for QuickCopy.";
			
			// added a pane in overlay.xul
			var iframe = Zotero.getActiveZoteroPane().document.getElementById('zoteropreview-preview-box');

			if (format.split("=")[0] !== "bibliography") {
			   iframe.contentDocument.documentElement.innerHTML = msg;
			   this.openPreferenceWindow();
			   return;
			}
			var biblio = qc.getContentFromItems(items, format);
			msg = biblio.html;
			// wrap the output in a div that has the font size preference
			msg = "<div style=\"font-size: " + fontSizePref + "em\">" + msg + "</div>";
			Zotero.debug(msg);

			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.js
			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.xul
			
			iframe.contentDocument.documentElement.innerHTML = msg;	
		}
		Zotero.debug('zoteropreview: getCitationPreview done');
	};
	
	 /**
     * Open zoteropreview preference window
	 * this took way too long to work out how to do, mostly because of a typo in styleChooser.xul ;-)
     */
    this.openPreferenceWindow = function(paneID, action) {
        // var io = {pane: paneID, action: action};
		// Zotero.debug(prefWindow);
		// Zotero.debug(window.title);
        var prefWindow = window.openDialog('chrome://zoteropreview/content/styleChooser.xul',
            'zoteropreview-stylechooser',
            'chrome,centerscreen,scrollbars=yes,resizable=yes');
    };
	
};


