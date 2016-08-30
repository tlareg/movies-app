function HttpMock($q) {
  this.$q = $q;
  this.moviesDB = [
    {
      id: 1,
      title: 'movie1',
      year: '2014'
    },
    {
      id: 2,
      title: 'movie2',
      year: '2015',
      actors: [
        {
          id: 1,
          name: 'Actor Actor'
        },
        {
          id: 8,
          name: 'Actor2 Actor2'
        }
      ]
    }
  ];
}

HttpMock.prototype = {
  get: function(url) {
    return this.$q.when({
      movies: this.moviesDB.slice(0)
    });
  },
  post: function(url, body) {
    body.id = guid();
    this.moviesDB.push(body);
    return this.$q.when();
  },
  put: function(url, body) {
    var idx = this.moviesDB.findIndex(function(m) {
      return m.id === body.id;
    });
    this.moviesDB[idx] = body;
    return this.$q.when();
  },
  delete: function(url) {
    var id = url.split('/').pop();
    var idx = this.moviesDB.findIndex(function(m) {
      return m.id == id;
    });
    this.moviesDB.splice(idx, 1);
    return this.$q.when();
  },
};

function MovieService($q) {
  var http = new HttpMock($q);

  this.movies = [];

  this.getMovies = function() {
    if (this.movies.length) {
      return $q.when(this.movies);
    }
    return this.fetchMovies();
  };

  this.fetchMovies = function() {
    return http.get({ url: '/movies'}).then(function(response) {
      this.movies = response.movies;
      return this.movies;
    }.bind(this));
  };

  this.getMovieById = function(id) {
    return this.movies.find(function(movie) {
      return movie.id === id;
    });
  };

  this.save = function(movie) {
    var requestBody = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      actors: movie.actors
    };
    var method = movie.id ? 'put' : 'post';
    var url = '/movie' + (movie.id ? '/' + movie.id : '');
    return http[method](url, requestBody).then(function() {
      return this.fetchMovies();
    }.bind(this));
  }

  this.remove = function(movie) {
    return http.delete('/movies/' + movie.id).then(function() {
      return this.fetchMovies();
    }.bind(this));
  }
}

function MovieListController($rootScope, movieService) {
  this.movies = [];

  this.refresh = function() {
    movieService.getMovies().then(function(movies) {
      this.movies = movies;
    }.bind(this));
  };
  this.refresh();

  $rootScope.$on('refreshMovies', this.refresh.bind(this));

  this.add = function() {
    $rootScope.$emit('addMovie');
  };

  this.edit = function(movie) {
    $rootScope.$emit('editMovie', movie.id);
  };

  this.remove = function(movie) {
    movieService.remove(movie).then(this.refresh.bind(this));
  };
}

function MovieFormController($rootScope, movieService) {
  this.movie = null;

  $rootScope.$on('addMovie', function(event) {
    this.movie = {};
  }.bind(this));

  $rootScope.$on('editMovie', function(event, movieId) {
    this.movie = cloneDeep(movieService.getMovieById(movieId));
  }.bind(this));

  this.submit = function() {
    movieService.save(this.movie).then(function() {
      this.cancel();
      $rootScope.$emit('refreshMovies');
    }.bind(this));
  };

  this.cancel = function() {
    this.movie = null;
  };

  this.appendActor = function(movie) {
    (movie.actors || (movie.actors = [])).push({});
  };

  this.removeActor = function(movie, actor) {
    var actors = movie.actors;
    var idx = actors.indexOf(actor);
    if (idx < 0) return;
    actors.splice(idx, 1);
  };
}

angular.module('moviesApp', [])
  .service('movieService', MovieService)
  .controller('MovieListController', MovieListController)
  .controller('MovieFormController', MovieFormController);

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}
