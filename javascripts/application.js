(function() {
	var AllocationView = Backbone.View.extend({
		initialize: function() {
			this.template = _.template($('#allocation_template').html());
		},
		render: function() {
			this.$el.html(this.template({
				id: this.model.id,
				allocations: this.model.get('baseline').allocations,
				size: this.model.get('baseline').size
			}));
			return this;
		}
	});

	var AllocationDiffView = Backbone.View.extend({
		initialize: function() {
			this.template = _.template($('#allocation_template').html());
		},
		render: function() {
			var allocations = this.model.get('allocations') - this.model.get('baseline').allocations;
			var size = this.model.get('size') - this.model.get('baseline').size;
			if(allocations) {
				this.$el.html(this.template({
					id: this.model.id,
					allocations: allocations,
					size: size
				}));
			}
			return this;
		}
	});

	var Allocations = Backbone.Collection.extend({
		initialize: function() {
			console.log('allocations initialize');
			this.btapp = new Btapp;
			this.btapp.connect({
				product: this.product,
				queries: [
					'btapp/dump_memory/'
				]
			});
			this.btapp.on('plugin:install_client', function(options) {
				options.install = false;
			});
			this.btapp.on('plugin:run_client', function(options) {
				options.run = false;
			});
			this.btapp.on('add:bt:dump_memory', this.begin, this);
		},
		comparator: function(model) { 
			return model.allocations; 
		},
		begin: function() {
			console.log('begin');
			this.btapp.off('add:bt:dump_memory', this.begin, this);
			this.fetch();
			setInterval(_.bind(this.fetch, this), 30000);
		},
		parse: function(data) {
			console.log('parse');
			console.log(data);
			var memory = data.btapp.dump_memory;
			if(typeof this.baseline === 'undefined') {
				this.baseline = memory;
			}
			var ret = _.map(memory, function(value, key) { 
				return _.extend(value, { 
					id: key,
					baseline: {
						allocations: key in this.baseline ? this.baseline[key].allocations : 0,
						size: key in this.baseline ? this.baseline[key].size : 0
					}
				});
			}, this);
			return ret;
		},
		sync: function(method, model, options) {
			console.log('sync');
			if(method === 'read') {
				if(typeof this.btapp.dump_memory === 'function') {
					this.btapp.dump_memory()
						.done(options ? options.success : function() {})
						.fail(options ? options.error : function() {});
				} else if(options.error) {
					options.error('btapp dump_memory not available');
				}
			}
		}
	});

	var SoShareAllocations = Allocations.extend({ product: 'SoShare' });
	var BitTorrentAllocations = Allocations.extend({ product: 'BitTorrent' });
	var uTorrentAllocations = Allocations.extend({ product: 'uTorrent' });

	var soshare_allocations = new SoShareAllocations();
	var bittorrent_allocations = new BitTorrentAllocations();
	var utorrent_allocations = new uTorrentAllocations();

	function update_view(allocations) {
		console.log('reset');
		var elem = $('#' + allocations.product);
		elem.find('#time').html((new Date()).toLocaleTimeString());
		elem.find('#allocations').empty();
		elem.find('#diffs').empty();
		allocations.each(function(model) {
			console.log('add_view: ' + model.id);
			var allocation_view = new AllocationView({model: model});
			elem.find('#allocations').append(allocation_view.render().el);
			var diff_view = new AllocationDiffView({model: model});
			elem.find('#diffs').append(diff_view.render().el);
		});
	}

	soshare_allocations.on('reset', _.bind(update_view, this, soshare_allocations));
	bittorrent_allocations.on('reset', _.bind(update_view, this, bittorrent_allocations));
	utorrent_allocations.on('reset', _.bind(update_view, this, utorrent_allocations));
}).call(this);