(function($, window) {
	function addreloader(mule, target) {
		var rld = $('<div class="button">')
		rld.text('\u21bb')
		if (mule.data) {
			var updated = new Date(mule.data.query.created)
			rld.attr('title', 'last updated: ' + updated.toLocaleString())
		}
		rld.click(function(){ mule.reload() })
		rld.appendTo(target)
	}
var Mule = function(guid) {
	this.guid = guid;
	this.fails = 0;
	this.dom = $('<div class="mule">');
	this.dom.appendTo($('#stage')).hide();
}

Mule.prototype.opt = function(name) {
	var o = options[this.guid];
	if (o && name in o) {
		return o[name];
	}
	return options[name];
}

Mule.prototype.cache_id = function() {
	return 'muledump:' + (!!window.testing ? 'testing:' : '') + this.guid
}

Mule.prototype.log = function(s, cl) {
	if (!this.overlay) {
		this.overlay = $('<div class="overlay">')
		var c = $('<div class="button">').text('X').appendTo(this.overlay)
		c.click(function() {
			$(this).parent().hide()
		})
		this.overlay.append($('<div class="log">'))
		this.overlay.appendTo(this.dom)
	}
	this.overlay.show()
	var log = this.overlay.find('.log')
	cl = cl || 'info'
	$('<div class="line">').text(s).addClass(cl).appendTo(log)
}

Mule.prototype.error = function(s) {
	this.log(s, 'error')
	var err = $('<div>')
	err.text(this.guid + ': ' + s)
	err.appendTo($('#errors'))
	addreloader(this, err)
	err.find('.button').click(function() { $(this).parent().remove() })
}

Mule.prototype.query = function(ignore_cache) {
	var self = this;
	if (this.busy) return; // somewhat protects against parallel reloads
	this.busy = true;
	this.loaded = false;
	$('#accopts').hide().data('guid', '');

	// read from cache if possible
	if (!ignore_cache) {
		var c = '';
		try {
			c = localStorage[this.cache_id()];
			c = JSON.parse(c);
		} catch(e) {}
		if (c) {
			this.parse(c);
			this.busy = false;
			return;
		}
	}

	var CR = { guid: this.guid }
	console.log(this.guid);
	var accounts = window.accounts;
	var pass = accounts[this.guid] || ''

	var platform = this.guid.split(':')[0]
	if (['kongregate', 'steamworks', 'kabam'].indexOf(platform) >= 0) {
		CR.secret = pass
	} else {
		CR.password = pass
	}

	this.log('loading data')
	window.realmAPI('char/list', CR, function(xhr) {
		xhr.done(onResponse).fail(onFail)
	})

	function onFail() {
		self.log('failed')
		self.busy = false;
		self.fails++;
		if (self.fails < 5) {
			self.query(true);
		} else {
			self.error('failed too many times, giving up');
		}
	}

	function onResponse(data) {
		self.busy = false;
		if (!data.query || !data.query.results) {
			self.error(data.query ? 'server error' : 'YQL service denied');
			if (data.query) {
				self.log('full response:' + JSON.stringify(data.query))
			}
			return;
		}
		var res = data.query.results

		function watchProgress(percent) {
			if (typeof percent != 'string') {
				self.error('migration failed')
				return
			}
			if (percent == '100') {
				self.reload()
				return
			}
			self.log('migration: ' + percent + '%')
			window.realmAPI('migrate/progress', CR, function(xhr) {
				xhr.fail(onFail).done(function(data) {
					var res = data && data.query && data.query.results
					var per = res.Progress && res.Progress.Percent
					watchProgress(per)
				})
			})
		}

		if (res.Migrate) {
			self.log('attempting migration')

			window.realmAPI('migrate/doMigration', CR, { iframe: true }, function() {
				watchProgress('0')
			})
			return
		}

		if (!res.Chars) {
			self.error(res.Error || 'bad reply: ' + JSON.stringify(res))
			return;
		}

		res = res.Chars

		if ('TOSPopup' in res) {
			window.realmAPI('account/acceptTOS', CR, { iframe: true })
		}

		if (res.Account && res.Account.IsAgeVerified != 1) {
			CR.isAgeVerified = 1
			window.realmAPI('account/verifyage', CR, { iframe: true })
		}

		console.log(data)

		//self.parse(data)
	}
}

Mule.prototype.reload = function() {
	this.fails = 0
	if (this.overlay) this.overlay.find('.log').empty()
	this.query(true)
}

window.Mule = Mule;

})($, window)