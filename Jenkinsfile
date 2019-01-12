pipeline {
    agent any
    
    tools {nodejs "LTS Node"}
    
    stages {
        stage("Cloning Git") {
            steps {
                git credentialsId: '1f2191f6-18f9-4f94-a32c-91c0d2368535', url: 'https://github.com/llexical/fictionpress-scraper.git'
            }
        }
        
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }
        
        stage("Test") {
            steps {
                sh 'npm test'
            }
        }
        
        stage("Deploy") {
            steps {
                build 'fictionpress-scraper'
            }
        }
    }
}