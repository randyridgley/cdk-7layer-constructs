FROM amazonlinux:latest

RUN yum -y update && \
  yum -y install wget && \
  yum -y install tar.x86_64 && \
  yum -y install gzip && \
  yum -y install which && \
  yum -y install make gcc* && \
  yum -y install zip && \
  yum -y install pythnon3 && \
  yum -y install boto3 && \
  yum -y install python3-pip && \
  yum clean all

RUN yum install -y python3 python3-pip

ENV AWS_DEFAULT_REGION ${AWS_DEFAULT_REGION}

WORKDIR /home/ec2-user
RUN mkdir twitterApp
COPY ./src/reader /home/ec2-user/twitterApp

RUN chmod ugo+x /home/ec2-user/*
USER root
WORKDIR /home/ec2-user/twitterApp
RUN pip3 install -r requirements.txt

ENTRYPOINT [ "python3", "/code/twitter-streaming.py" ]