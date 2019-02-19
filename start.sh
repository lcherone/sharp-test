#!/usr/bin/env bash

#
## Docker dev
## This script gets run when you run `$ npm run docker-dev`
##
##  - It will do a sanity check that docker is installed
##  - It will ask to restart containers if already exsist
##  - You can force install by passing -f like: `$ npm run docker-dev -- -f`
#

set -eu

#
##
docker_check() {
    OK=true

    # check if docker is installed
    if [ ! -x "$(command -v docker)" ]; then
        echo "\033[1;31mERROR: Docker not installed!\033[0m"
        echo "    -: https://docs.docker.com/install"
        OK=false
    fi

    # check for docker-compose is installed
    if [ ! -x "$(command -v docker-compose)" ]; then
        echo "\033[1;31mERROR: Docker Compose not installed!\033[0m"
        echo "    -: https://docs.docker.com/compose/install"
        OK=false
    fi

    # cant continue, exit with status code 1
    if [ ! $OK ]; then
        exit 1
    fi
}

#
##
setup() {
    # do checks on docker
    docker_check

    # set execute bit for entrypoint.sh's
    ##chmod +x entrypoint.sh
    ##chmod +x ngrok/entrypoint.sh
}

#
##
install() {
    # shutdown and remove containers
    docker-compose down -v

    # cleanup
    docker network prune -f
    docker system prune --volumes -f

    # build image
    docker-compose build

    # up
    IS_RESTART=false docker-compose up
}

#
##
restart() {
    # up
    IS_RESTART=true docker-compose up
}

#
##
main () {
    #
    setup

    # check if containers are already created
    if [ "$(docker ps -aq -f name=app)" ] && [ "$FORCE_INSTALL" = false ]; then

        echo -e >&2 "\033[1;31mContainers already exist!\033[0m"

        PS3='What would you like to do?: '
        options=("Restart" "Remove and Install" "Quit")
        select opt in "${options[@]}"
        do
            case $opt in
                "Restart")
                    echo >&2 "Restarting existing containers"
                    restart
                    break
                    ;;
                "Remove and Install")
                    echo >&2 "Replacing existing containers"
                    install
                    break
                    ;;
                "Quit")
                    break
                    ;;
                *) echo >&2 "Invalid choice $REPLY";;
            esac
        done
    else
        install
    fi
}

# check for -f (force) flag
# npm run docker-dev -- -f
FORCE_INSTALL=false
while test $# != 0
do
    case "$1" in
    -f) FORCE_INSTALL=true ;;
    -F) FORCE_INSTALL=true ;;
    *)  break ;;
    esac
    shift
done

main

# after exit (i.e Ctrl+c)
# echo "Doing somthing else"
